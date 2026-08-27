import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter, Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  METRIC_REQUEST_DURATION_SECONDS,
  METRIC_REQUESTS_TOTAL,
} from './metrics.constants';

type RequestStatus = 'success' | 'error';

/**
 * Global interceptor that records request/message count and duration
 * for both HTTP routes (gateway) and NATS `@MessagePattern` handlers
 * (microservices), since `ExecutionContext.getType()` distinguishes
 * between `'http'` and `'rpc'` transparently.
 *
 * Registered automatically by `MetricsModule.forRoot()` as an
 * `APP_INTERCEPTOR` provider — it depends on the metric providers being
 * resolved through the Nest DI container, so unlike `RequestIdInterceptor`
 * it cannot be instantiated manually with `new` in `main.ts`.
 */
@Injectable()
export class RequestMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric(METRIC_REQUESTS_TOTAL)
    private readonly requestsTotal: Counter<string>,
    @InjectMetric(METRIC_REQUEST_DURATION_SECONDS)
    private readonly requestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const type = context.getType();
    const pattern = `${context.getClass().name}.${context.getHandler().name}`;
    const endTimer = this.requestDuration.startTimer({ type, pattern });

    return next.handle().pipe(
      tap(() => this.record(type, pattern, 'success', endTimer)),
      catchError((err: unknown) => {
        this.record(type, pattern, 'error', endTimer);
        throw err;
      }),
    );
  }

  private record(
    type: string,
    pattern: string,
    status: RequestStatus,
    endTimer: (labels?: Record<string, string>) => number,
  ): void {
    this.requestsTotal.inc({ type, pattern, status });
    endTimer({ status });
  }
}
