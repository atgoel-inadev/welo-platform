import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StateTransition } from '@app/common';

@Injectable()
export class TransitionService {
  constructor(
    @InjectRepository(StateTransition)
    private transitionRepository: Repository<StateTransition>,
  ) {}

  async findOne(id: string): Promise<StateTransition> {
    return this.transitionRepository.findOne({
      where: { id },
      relations: ['workflow'],
    });
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    limit: number = 100,
  ): Promise<StateTransition[]> {
    return this.transitionRepository.find({
      where: { entityType: entityType as any, entityId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByWorkflow(
    workflowId: string,
    options?: {
      eventType?: string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    },
  ): Promise<StateTransition[]> {
    const query = this.transitionRepository
      .createQueryBuilder('transition')
      .where('transition.workflowId = :workflowId', { workflowId });

    if (options?.eventType) {
      query.andWhere('transition.eventType = :eventType', {
        eventType: options.eventType,
      });
    }

    if (options?.fromDate) {
      query.andWhere('transition.createdAt >= :fromDate', {
        fromDate: options.fromDate,
      });
    }

    if (options?.toDate) {
      query.andWhere('transition.createdAt <= :toDate', {
        toDate: options.toDate,
      });
    }

    query.orderBy('transition.createdAt', 'DESC');
    query.take(options?.limit || 100);

    return query.getMany();
  }

  async getAnalytics(workflowId: string, period: string = '7d') {
    const daysAgo = period === '30d' ? 30 : 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysAgo);

    const transitions = await this.findByWorkflow(workflowId, { fromDate });

    // Calculate analytics
    const transitionBreakdown: Record<string, number> = {};
    const eventCounts: Record<string, number> = {};
    let failedCount = 0;
    let totalDuration = 0;
    let countWithDuration = 0;

    transitions.forEach((t) => {
      const key = `${t.fromState.value} → ${t.toState.value}`;
      transitionBreakdown[key] = (transitionBreakdown[key] || 0) + 1;

      eventCounts[t.event.type] = (eventCounts[t.event.type] || 0) + 1;

      if (t.error) {
        failedCount++;
      }

      if (t.duration) {
        totalDuration += t.duration;
        countWithDuration++;
      }
    });

    return {
      totalTransitions: transitions.length,
      transitionBreakdown,
      averageDurationByTransition: countWithDuration > 0 ? totalDuration / countWithDuration : 0,
      failedTransitions: failedCount,
      mostCommonEvents: Object.entries(eventCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
    };
  }
}
