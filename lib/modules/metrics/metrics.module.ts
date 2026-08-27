import { DynamicModule, Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { getToken, PrometheusModule } from '@willsoto/nestjs-prometheus';
import {
  DEFAULT_METRICS_PATH,
  METRIC_REQUEST_DURATION_SECONDS,
  METRIC_REQUESTS_TOTAL,
} from './metrics.constants';
import { RequestMetricsInterceptor } from './metrics.interceptor';
import { createMetricsProviders } from './metrics.providers';
import { MetricsModuleOptions } from './metrics.types';

/**
 * Exposes a Prometheus-compatible `/metrics` endpoint (via
 * `@willsoto/nestjs-prometheus`) plus default Node.js process metrics and
 * a request/message counter + duration histogram, wired globally so a
 * single Prometheus + Grafana instance can scrape every microservice and
 * chart them on one dashboard.
 *
 * @example
 * ```typescript
 * // In app.module.ts of any service (gateway or NATS microservice)
 * @Module({
 *   imports: [
 *     MetricsModule.forRoot({
 *       defaultLabels: { service: 'auth-ms' },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class MetricsModule {
  static forRoot(options: MetricsModuleOptions = {}): DynamicModule {
    const metricProviders = createMetricsProviders(options.buckets);

    return {
      module: MetricsModule,
      imports: [
        PrometheusModule.register({
          path: options.path ?? DEFAULT_METRICS_PATH,
          defaultLabels: options.defaultLabels,
          defaultMetrics: {
            enabled: options.defaultMetricsEnabled ?? true,
          },
        }),
      ],
      providers: [
        ...metricProviders,
        { provide: APP_INTERCEPTOR, useClass: RequestMetricsInterceptor },
      ],
      exports: [
        PrometheusModule,
        getToken(METRIC_REQUESTS_TOTAL),
        getToken(METRIC_REQUEST_DURATION_SECONDS),
      ],
    };
  }
}
