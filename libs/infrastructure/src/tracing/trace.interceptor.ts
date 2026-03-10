import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { trace, SpanStatusCode } from '@opentelemetry/api';

/**
 * TraceInterceptor
 *
 * Applied globally in each service's bootstrap. For every inbound HTTP request:
 * - Enriches the active span (created by OTel HTTP auto-instrumentation) with
 *   additional attributes: route, user ID, response status
 * - Injects x-trace-id / x-span-id response headers for client-side correlation
 * - Records exceptions and marks the span as ERROR on unhandled errors
 *
 * Note: This interceptor does NOT create spans — it relies on
 * `@opentelemetry/instrumentation-http` (via getNodeAutoInstrumentations) to
 * create the server span and propagate incoming W3C TraceContext headers.
 */
@Injectable()
export class TraceInterceptor implements NestInterceptor {
  intercept(executionCtx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = executionCtx.switchToHttp().getRequest<Record<string, any>>();
    const res = executionCtx.switchToHttp().getResponse<Record<string, any>>();

    const activeSpan = trace.getActiveSpan();

    if (activeSpan) {
      // Enrich span with route-level detail (auto-instrumentation only sets url)
      activeSpan.setAttribute('http.route', req.route?.path ?? req.url ?? '');

      // Propagate user identity if auth guard has already resolved it
      const userId: string | undefined = (req.user as any)?.userId;
      if (userId) {
        activeSpan.setAttribute('enduser.id', userId);
      }

      // Expose trace/span IDs in response so callers can correlate logs
      const spanCtx = activeSpan.spanContext();
      res.setHeader?.('x-trace-id', spanCtx.traceId);
      res.setHeader?.('x-span-id', spanCtx.spanId);
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode: number = res.statusCode;
          if (activeSpan) {
            activeSpan.setAttribute('http.status_code', statusCode);
            if (statusCode >= 400) {
              activeSpan.setStatus({ code: SpanStatusCode.ERROR });
            }
          }
        },
        error: (err: Error) => {
          if (activeSpan) {
            activeSpan.recordException(err);
            activeSpan.setStatus({
              code: SpanStatusCode.ERROR,
              message: err.message,
            });
          }
        },
      }),
    );
  }
}
