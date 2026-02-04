import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StateTransition, TransitionType } from '@app/common';
import { WorkflowService } from '../workflow/workflow.service';
import { RedisService } from '../redis/redis.service';
import { createActor } from 'xstate';
import { SendEventDto, BatchSendEventDto } from './dto/event.dto';
import { CACHE_KEYS, EventTrigger } from '@app/common';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @InjectRepository(StateTransition)
    private transitionRepository: Repository<StateTransition>,
    private workflowService: WorkflowService,
    private redisService: RedisService,
  ) {}

  async sendEvent(
    entityType: string,
    entityId: string,
    workflowId: string,
    eventDto: SendEventDto,
    userId?: string,
  ) {
    this.logger.log(`Sending event ${eventDto.type} to ${entityType}:${entityId}`);

    // Get workflow machine
    const machine = await this.workflowService.getCompiledMachine(workflowId);

    // Get current state from cache/storage
    const currentStateKey = CACHE_KEYS.TASK_STATE(entityId);
    const currentStateJson = await this.redisService.get(currentStateKey);

    if (!currentStateJson) {
      throw new NotFoundException(`State not found for ${entityType}:${entityId}`);
    }

    const currentState = JSON.parse(currentStateJson);

    // Create actor with current state
    const actor = createActor(machine, {
      snapshot: currentState,
    });

    actor.start();

    const previousState = actor.getSnapshot();

    // Send event
    try {
      actor.send({
        type: eventDto.type,
        ...eventDto.payload,
      });
    } catch (error) {
      throw new BadRequestException(`Failed to process event: ${error.message}`);
    }

    const newState = actor.getSnapshot();

    // Check if state actually changed
    const changed = previousState.value !== newState.value;

    // Save transition
    const transition = this.transitionRepository.create({
      entityType: entityType as any,
      entityId,
      workflowId,
      event: {
        type: eventDto.type,
        payload: eventDto.payload,
        timestamp: eventDto.timestamp || new Date().toISOString(),
        origin: 'event_service',
      },
      fromState: {
        value: previousState.value,
        context: previousState.context,
        tags: Array.from(previousState.tags || []),
      },
      toState: {
        value: newState.value,
        context: newState.context,
        tags: Array.from(newState.tags || []),
      },
      transitionType: changed ? TransitionType.EXTERNAL : TransitionType.INTERNAL,
      userId,
      triggeredBy: EventTrigger.USER_ACTION,
      isAutomatic: false,
      duration: Date.now() - new Date(previousState.context.startTime || Date.now()).getTime(),
    });

    const savedTransition = await this.transitionRepository.save(transition);

    // Update cached state
    await this.redisService.set(currentStateKey, JSON.stringify(newState), 3600);

    return {
      transitionId: savedTransition.id,
      previousState: {
        value: previousState.value,
        context: previousState.context,
      },
      currentState: {
        value: newState.value,
        context: newState.context,
        changed,
        tags: Array.from(newState.tags || []),
      },
      actionsExecuted: [],
    };
  }

  async getCurrentState(entityType: string, entityId: string, workflowId: string) {
    const stateKey = CACHE_KEYS.TASK_STATE(entityId);
    const stateJson = await this.redisService.get(stateKey);

    if (!stateJson) {
      throw new NotFoundException(`State not found for ${entityType}:${entityId}`);
    }

    const state = JSON.parse(stateJson);

    // Get workflow to determine next possible events
    const machine = await this.workflowService.getCompiledMachine(workflowId);
    const actor = createActor(machine, { snapshot: state });
    actor.start();
    const currentSnapshot = actor.getSnapshot();

    // Extract possible events from state configuration
    const nextEvents = this.extractPossibleEvents(currentSnapshot);

    return {
      taskId: entityId,
      workflowId,
      currentState: {
        value: state.value,
        context: state.context,
        tags: Array.from(state.tags || []),
        done: state.status === 'done',
      },
      nextEvents,
      canTransition: nextEvents.length > 0,
      stateUpdatedAt: state.updatedAt || new Date().toISOString(),
    };
  }

  async getStateHistory(entityType: string, entityId: string, limit: number = 50) {
    const transitions = await this.transitionRepository.find({
      where: { entityType: entityType as any, entityId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return transitions.map((t) => ({
      transitionId: t.id,
      fromState: t.fromState.value,
      toState: t.toState.value,
      event: t.event,
      userId: t.userId,
      duration: t.duration,
      createdAt: t.createdAt,
    }));
  }

  async restoreState(
    entityType: string,
    entityId: string,
    transitionId: string,
    reason?: string,
  ) {
    const transition = await this.transitionRepository.findOne({
      where: { id: transitionId },
    });

    if (!transition) {
      throw new NotFoundException(`Transition ${transitionId} not found`);
    }

    // Restore to previous state
    const stateKey = CACHE_KEYS.TASK_STATE(entityId);
    await this.redisService.set(stateKey, JSON.stringify(transition.fromState), 3600);

    this.logger.log(
      `Restored ${entityType}:${entityId} to state ${transition.fromState.value}. Reason: ${reason}`,
    );

    return {
      success: true,
      restoredState: transition.fromState.value,
      reason,
    };
  }

  async getPossibleTransitions(entityType: string, entityId: string, workflowId: string) {
    const currentStateData = await this.getCurrentState(entityType, entityId, workflowId);
    const machine = await this.workflowService.getCompiledMachine(workflowId);

    // This is simplified - in production you'd analyze the state config more thoroughly
    const possibleEvents = currentStateData.nextEvents.map((eventType) => ({
      eventType,
      targetState: 'unknown', // Would need to analyze transitions
      guards: [],
      canExecute: true,
    }));

    return {
      currentState: currentStateData.currentState.value,
      possibleEvents,
    };
  }

  async sendBatchEvents(batchDto: BatchSendEventDto) {
    const results = [];

    for (const item of batchDto.events) {
      try {
        const result = await this.sendEvent(
          item.entityType,
          item.entityId,
          'unknown', // Would need to be provided
          item.event,
        );
        results.push({ success: true, entityId: item.entityId, result });
      } catch (error) {
        results.push({
          success: false,
          entityId: item.entityId,
          error: error.message,
        });
      }
    }

    return { results };
  }

  private extractPossibleEvents(snapshot: any): string[] {
    // Extract event types that can be sent from current state
    const events: string[] = [];

    // This is simplified - XState v5 provides better ways to get this
    if (snapshot._nodes && snapshot._nodes.length > 0) {
      const node = snapshot._nodes[0];
      if (node.config?.on) {
        events.push(...Object.keys(node.config.on));
      }
    }

    return events;
  }
}
