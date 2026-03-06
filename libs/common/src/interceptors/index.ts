import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditAction } from '../enums';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      return next.handle();
    }

    const action = this.mapMethod(req.method);
    const userId: string | null =
      (req.user as any)?.userId ?? req.headers['x-user-id'] ?? null;

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const entityId: string | null =
            (response as any)?.id ?? req.params?.id ?? null;
          if (!entityId || entityId === 'undefined') return;

          const entityType = this.extractEntityType(req.path as string);

          await this.auditRepo.save(
            this.auditRepo.create({
              entityType,
              entityId,
              action,
              userId,
              timestamp: new Date(),
              ipAddress:
                (req.headers['x-forwarded-for'] as string) ?? req.ip,
              userAgent: req.headers['user-agent'],
            }),
          );
        } catch (err) {
          // Audit failures must never break the request
          this.logger.warn(`Audit write failed: ${(err as Error).message}`);
        }
      }),
    );
  }

  private mapMethod(method: string): AuditAction {
    const map: Record<string, AuditAction> = {
      POST: AuditAction.CREATE,
      PATCH: AuditAction.UPDATE,
      PUT: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    };
    return map[method];
  }

  private extractEntityType(path: string): string {
    // Strip version prefix, e.g. /api/v1/tasks/123 → tasks
    const cleaned = path.replace(/^\/(api\/)?v\d+\//, '');
    const segment = cleaned.split('/')[0] ?? 'UNKNOWN';
    // Singularize by stripping trailing 's' (tasks → TASK, batches → BATCH)
    return segment.replace(/s$/, '').toUpperCase();
  }
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const delay = Date.now() - now;
        this.logger.log(
          `${method} ${url} ${response.statusCode} - ${delay}ms`,
        );
      }),
    );
  }
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    return next.handle().pipe(
      tap((data) => {
        if (data && typeof data === 'object' && !('success' in data)) {
          return {
            success: true,
            data,
            metadata: {
              timestamp: new Date().toISOString(),
              request_id:
                context.switchToHttp().getRequest().id || 'unknown',
            },
          };
        }
        return data;
      }),
    );
  }
}
