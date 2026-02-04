import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WorkflowInstance,
  WorkflowInstanceStatus as InstanceStatus,
  ActorType,
} from '@app/common';
import { WorkflowService } from '../workflow/workflow.service';
import { RedisService } from '../redis/redis.service';
import { createActor } from 'xstate';
import { CreateInstanceDto, StopInstanceDto, RestoreInstanceDto } from './dto/instance.dto';
import { CACHE_KEYS } from '@app/common';

@Injectable()
export class InstanceService {
  private readonly logger = new Logger(InstanceService.name);
  private actorRegistry: Map<string, any> = new Map();

  constructor(
    @InjectRepository(WorkflowInstance)
    private instanceRepository: Repository<WorkflowInstance>,
    private workflowService: WorkflowService,
    private redisService: RedisService,
  ) {}

  async create(createDto: CreateInstanceDto): Promise<WorkflowInstance> {
    this.logger.log(`Creating workflow instance for workflow ${createDto.workflowId}`);

    const machine = await this.workflowService.getCompiledMachine(createDto.workflowId);

    const actor = createActor(machine, {
      input: createDto.initialContext,
    });

    actor.start();

    const snapshot = actor.getSnapshot();

    const instance = this.instanceRepository.create({
      workflowId: createDto.workflowId,
      batchId: createDto.batchId,
      name: createDto.name,
      actorState: {
        value: snapshot.value,
        context: snapshot.context,
        done: snapshot.status === 'done',
        tags: Array.from(snapshot.tags || []),
      },
      actorType: ActorType.ROOT,
      actorRefId: `instance-${Date.now()}`,
      status: InstanceStatus.RUNNING,
      startedAt: new Date(),
    });

    const saved = await this.instanceRepository.save(instance);

    // Register actor
    this.actorRegistry.set(saved.id, actor);

    // Cache actor state
    await this.redisService.set(
      CACHE_KEYS.ACTOR_REGISTRY(saved.id),
      JSON.stringify(snapshot),
      3600,
    );

    return saved;
  }

  async findOne(id: string): Promise<WorkflowInstance> {
    const instance = await this.instanceRepository.findOne({
      where: { id },
      relations: ['workflow'],
    });

    if (!instance) {
      throw new NotFoundException(`Workflow instance ${id} not found`);
    }

    return instance;
  }

  async findByBatch(batchId: string): Promise<WorkflowInstance[]> {
    return this.instanceRepository.find({
      where: { batchId },
      relations: ['workflow'],
    });
  }

  async sendEvent(instanceId: string, event: { type: string; payload?: any }) {
    const instance = await this.findOne(instanceId);

    let actor = this.actorRegistry.get(instanceId);

    if (!actor) {
      // Restore actor from snapshot
      const machine = await this.workflowService.getCompiledMachine(instance.workflowId);
      actor = createActor(machine, {
        snapshot: instance.actorState as any,
      });
      actor.start();
      this.actorRegistry.set(instanceId, actor);
    }

    actor.send(event);

    const newSnapshot = actor.getSnapshot();

    instance.actorState = {
      value: newSnapshot.value,
      context: newSnapshot.context,
      done: newSnapshot.status === 'done',
      tags: Array.from(newSnapshot.tags || []),
    };

    if (newSnapshot.status === 'done') {
      instance.status = InstanceStatus.COMPLETED;
      instance.completedAt = new Date();
      this.actorRegistry.delete(instanceId);
    }

    await this.instanceRepository.save(instance);

    // Update cache
    await this.redisService.set(
      CACHE_KEYS.ACTOR_REGISTRY(instanceId),
      JSON.stringify(newSnapshot),
      3600,
    );

    return instance;
  }

  async pause(instanceId: string): Promise<WorkflowInstance> {
    const instance = await this.findOne(instanceId);

    if (instance.status !== InstanceStatus.RUNNING) {
      throw new BadRequestException(`Instance ${instanceId} is not running`);
    }

    // Create snapshot
    const actor = this.actorRegistry.get(instanceId);
    if (actor) {
      const snapshot = actor.getSnapshot();
      instance.snapshot = snapshot;
      instance.checkpointAt = new Date();
      actor.stop();
      this.actorRegistry.delete(instanceId);
    }

    instance.status = InstanceStatus.PAUSED;
    return this.instanceRepository.save(instance);
  }

  async resume(instanceId: string): Promise<WorkflowInstance> {
    const instance = await this.findOne(instanceId);

    if (instance.status !== InstanceStatus.PAUSED) {
      throw new BadRequestException(`Instance ${instanceId} is not paused`);
    }

    // Restore from snapshot
    const machine = await this.workflowService.getCompiledMachine(instance.workflowId);
    const actor = createActor(machine, {
      snapshot: (instance.snapshot || instance.actorState) as any,
    });

    actor.start();
    this.actorRegistry.set(instanceId, actor);

    instance.status = InstanceStatus.RUNNING;
    return this.instanceRepository.save(instance);
  }

  async stop(instanceId: string, stopDto: StopInstanceDto): Promise<WorkflowInstance> {
    const instance = await this.findOne(instanceId);

    const actor = this.actorRegistry.get(instanceId);
    if (actor) {
      actor.stop();
      this.actorRegistry.delete(instanceId);
    }

    instance.status = InstanceStatus.STOPPED;
    instance.completedAt = new Date();
    instance.metadata = {
      ...instance.metadata,
      stopReason: stopDto.reason,
      forceStopped: stopDto.force,
    };

    return this.instanceRepository.save(instance);
  }

  async getSnapshot(instanceId: string) {
    const instance = await this.findOne(instanceId);
    return {
      instanceId: instance.id,
      snapshot: instance.snapshot || instance.actorState,
      checkpointAt: instance.checkpointAt,
    };
  }

  async restore(instanceId: string, restoreDto: RestoreInstanceDto): Promise<WorkflowInstance> {
    const instance = await this.findOne(instanceId);

    const machine = await this.workflowService.getCompiledMachine(instance.workflowId);
    const actor = createActor(machine, {
      snapshot: restoreDto.snapshot,
    });

    actor.start();
    this.actorRegistry.set(instanceId, actor);

    instance.actorState = restoreDto.snapshot;
    instance.status = InstanceStatus.RUNNING;

    return this.instanceRepository.save(instance);
  }

  async getChildActors(instanceId: string) {
    return this.instanceRepository.find({
      where: { parentInstanceId: instanceId },
    });
  }
}
