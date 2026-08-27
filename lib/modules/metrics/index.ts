// Module
export { MetricsModule } from './metrics.module';

// Interceptor
export { RequestMetricsInterceptor } from './metrics.interceptor';

// Constants
export {
  DEFAULT_DURATION_BUCKETS,
  DEFAULT_METRICS_PATH,
  METRIC_REQUEST_DURATION_SECONDS,
  METRIC_REQUESTS_TOTAL,
} from './metrics.constants';

// Types
export type { MetricsModuleOptions } from './metrics.types';

// Re-exported so consuming services can define their own business
// metrics (e.g. `orders_created_total`) without adding
// `@willsoto/nestjs-prometheus` as a direct dependency.
export {
  InjectMetric,
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
  makeSummaryProvider,
} from '@willsoto/nestjs-prometheus';
