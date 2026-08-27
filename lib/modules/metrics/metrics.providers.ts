import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import {
  DEFAULT_DURATION_BUCKETS,
  METRIC_REQUEST_DURATION_SECONDS,
  METRIC_REQUESTS_TOTAL,
} from './metrics.constants';

export const createMetricsProviders = (buckets?: number[]) => [
  makeCounterProvider({
    name: METRIC_REQUESTS_TOTAL,
    help: 'Total number of HTTP requests and NATS messages processed',
    labelNames: ['type', 'pattern', 'status'],
  }),
  makeHistogramProvider({
    name: METRIC_REQUEST_DURATION_SECONDS,
    help: 'Duration of HTTP requests and NATS messages in seconds',
    labelNames: ['type', 'pattern', 'status'],
    buckets: buckets ?? DEFAULT_DURATION_BUCKETS,
  }),
];
