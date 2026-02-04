import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow, WorkflowStatus } from '@app/common';
import { CreateWorkflowDto, UpdateWorkflowDto, SimulateWorkflowDto } from './dto/workflow.dto';
import { createMachine, createActor, StateValue } from 'xstate';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS } from '@app/common';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,
    private redisService: RedisService,
  ) {}

  async create(createDto: CreateWorkflowDto, userId?: string): Promise<Workflow> {
    this.logger.log(`Creating workflow: ${createDto.name}`);

    // Validate XState definition
    try {
      createMachine(createDto.xstateDefinition as any);
    } catch (error) {
      throw new BadRequestException('Invalid XState machine definition');
    }

    const workflow = this.workflowRepository.create({
      ...createDto,
      createdBy: userId,
      version: 1,
      status: WorkflowStatus.DRAFT,
    });

    const saved = await this.workflowRepository.save(workflow);

    // Cache the workflow definition
    await this.cacheWorkflow(saved);

    return saved;
  }

  async findAll(projectId?: string, status?: WorkflowStatus, isTemplate?: boolean) {
    const query = this.workflowRepository.createQueryBuilder('workflow');

    if (projectId) {
      query.andWhere('workflow.projectId = :projectId', { projectId });
    }

    if (status) {
      query.andWhere('workflow.status = :status', { status });
    }

    if (isTemplate !== undefined) {
      query.andWhere('workflow.isTemplate = :isTemplate', { isTemplate });
    }

    query.orderBy('workflow.createdAt', 'DESC');

    return query.getMany();
  }

  async findOne(id: string): Promise<Workflow> {
    // Try cache first
    const cached = await this.getCachedWorkflow(id);
    if (cached) {
      return cached;
    }

    const workflow = await this.workflowRepository.findOne({ where: { id } });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    // Cache for future use
    await this.cacheWorkflow(workflow);

    return workflow;
  }

  async update(id: string, updateDto: UpdateWorkflowDto): Promise<Workflow> {
    const workflow = await this.findOne(id);

    // If updating xstate definition, validate it
    if (updateDto.xstateDefinition) {
      try {
        createMachine(updateDto.xstateDefinition);
      } catch (error) {
        throw new BadRequestException('Invalid XState machine definition');
      }
    }

    // Increment version if definition changes
    if (updateDto.xstateDefinition && updateDto.xstateDefinition !== workflow.xstateDefinition) {
      workflow.version += 1;
    }

    Object.assign(workflow, updateDto);

    const updated = await this.workflowRepository.save(workflow);

    // Update cache
    await this.cacheWorkflow(updated);

    return updated;
  }

  async remove(id: string): Promise<void> {
    const workflow = await this.findOne(id);
    await this.workflowRepository.remove(workflow);

    // Remove from cache
    await this.redisService.del(CACHE_KEYS.WORKFLOW_DEFINITION(id));
    await this.redisService.del(CACHE_KEYS.COMPILED_MACHINE(id));
  }

  async validate(id: string) {
    const workflow = await this.findOne(id);
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const machine = createMachine(workflow.xstateDefinition as any);

      // Check for unreachable states
      const states = this.extractStates(workflow.xstateDefinition.states);
      states.forEach((stateName) => {
        const hasIncomingTransitions = this.hasIncomingTransitions(
          workflow.xstateDefinition.states,
          stateName,
        );
        if (!hasIncomingTransitions && stateName !== workflow.xstateDefinition.initial) {
          warnings.push(`State '${stateName}' may be unreachable`);
        }
      });

      return {
        isValid: true,
        errors,
        warnings,
        visualizationUrl: null,
      };
    } catch (error) {
      errors.push(error.message);
      return {
        isValid: false,
        errors,
        warnings,
        visualizationUrl: null,
      };
    }
  }

  async simulate(id: string, simulateDto: SimulateWorkflowDto) {
    const workflow = await this.findOne(id);

    try {
      const machine = createMachine(workflow.xstateDefinition as any);
      const actor = createActor(machine, {
        input: simulateDto.initialContext,
      });

      const transitions: any[] = [];
      const actionsExecuted: string[] = [];

      let currentState = actor.getSnapshot();

      for (const event of simulateDto.events) {
        const previousState = currentState.value;
        actor.send(event);
        currentState = actor.getSnapshot();

        transitions.push({
          from: previousState,
          to: currentState.value,
          event: event.type,
        });

        // Track actions (simplified)
        if (currentState.value !== previousState) {
          actionsExecuted.push(`Transitioned from ${previousState} to ${currentState.value}`);
        }
      }

      return {
        finalState: currentState.value,
        finalContext: currentState.context,
        transitions,
        actionsExecuted,
      };
    } catch (error) {
      throw new BadRequestException(`Simulation failed: ${error.message}`);
    }
  }

  async getCompiledMachine(workflowId: string) {
    // Check cache first
    const cached = await this.redisService.get(CACHE_KEYS.COMPILED_MACHINE(workflowId));
    if (cached) {
      return createMachine(JSON.parse(cached) as any);
    }

    const workflow = await this.findOne(workflowId);
    const machine = createMachine(workflow.xstateDefinition as any);

    // Cache the compiled machine
    await this.redisService.set(
      CACHE_KEYS.COMPILED_MACHINE(workflowId),
      JSON.stringify(workflow.xstateDefinition),
      3600,
    );

    return machine;
  }

  private async cacheWorkflow(workflow: Workflow): Promise<void> {
    await this.redisService.set(
      CACHE_KEYS.WORKFLOW_DEFINITION(workflow.id),
      JSON.stringify(workflow),
      3600,
    );
  }

  private async getCachedWorkflow(id: string): Promise<Workflow | null> {
    const cached = await this.redisService.get(CACHE_KEYS.WORKFLOW_DEFINITION(id));
    return cached ? JSON.parse(cached) : null;
  }

  private extractStates(states: any): string[] {
    const stateNames: string[] = [];
    for (const [name, config] of Object.entries(states)) {
      stateNames.push(name);
      if (config && typeof config === 'object' && 'states' in config) {
        stateNames.push(...this.extractStates((config as any).states));
      }
    }
    return stateNames;
  }

  private hasIncomingTransitions(states: any, targetState: string): boolean {
    for (const config of Object.values(states)) {
      if (config && typeof config === 'object' && 'on' in config) {
        const transitions = (config as any).on;
        for (const transition of Object.values(transitions)) {
          if (typeof transition === 'string' && transition === targetState) {
            return true;
          }
          if (typeof transition === 'object' && (transition as any).target === targetState) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
