# Metrics Module

Prometheus instrumentation for NestJS services, built on top of
[`@willsoto/nestjs-prometheus`](https://github.com/willsoto/nestjs-prometheus)
and `prom-client`. Designed so every microservice in the workspace can be
scraped by one Prometheus instance and charted on a single Grafana
dashboard, instead of inspecting each service's metrics in isolation.

## Features

- Exposes a `/metrics` endpoint on the same HTTP listener each service
  already boots for its health check — no extra port to open.
- Default Node.js/process metrics for free (CPU, memory, event loop lag,
  GC, active handles).
- A request/message counter (`app_requests_total`) and duration histogram
  (`app_request_duration_seconds`), automatically recorded for **both**
  HTTP routes (`client-gw`) and NATS `@MessagePattern` handlers (every
  other microservice), labeled by `type`, `pattern`, and `status`.
- `defaultLabels` lets each service stamp every metric with its own
  identity (e.g. `{ service: 'auth-ms' }`), which is what makes a single
  dashboard able to group/filter by service.

## Basic Usage

```typescript
import { MetricsModule } from '@digoai/piatti-common';

@Module({
  imports: [
    MetricsModule.forRoot({
      defaultLabels: { service: 'auth-ms' },
    }),
  ],
})
export class AppModule {}
```

That's it — no manual interceptor wiring is needed. `MetricsModule.forRoot()`
registers `RequestMetricsInterceptor` globally as an `APP_INTERCEPTOR`
provider (it depends on injected metric instances, so unlike
`RequestIdInterceptor` it can't be applied by hand with
`app.useGlobalInterceptors(new ...)`).

### Custom path or buckets

```typescript
MetricsModule.forRoot({
  path: '/internal/metrics',
  defaultLabels: { service: 'order-ms' },
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});
```

## API Reference

### MetricsModuleOptions

```typescript
interface MetricsModuleOptions {
  path?: string; // default: '/metrics'
  defaultLabels?: Record<string, string>;
  defaultMetricsEnabled?: boolean; // default: true
  buckets?: number[]; // default: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
}
```

### Metrics emitted

| Metric                          | Type      | Labels                     |
| -------------------------------- | --------- | --------------------------- |
| `app_requests_total`             | Counter   | `type`, `pattern`, `status` |
| `app_request_duration_seconds`   | Histogram | `type`, `pattern`, `status` |

- `type`: `'http'` or `'rpc'` (NATS).
- `pattern`: `<ControllerClass>.<handlerMethod>`.
- `status`: `'success'` or `'error'`.

## Adding business metrics

The module re-exports `@willsoto/nestjs-prometheus`'s provider factories
and `InjectMetric`, so a service can define its own counters/gauges
without adding that package as a direct dependency:

```typescript
import { InjectMetric, makeCounterProvider } from '@digoai/piatti-common';
import { Counter } from 'prom-client';

@Module({
  providers: [
    makeCounterProvider({
      name: 'orders_created_total',
      help: 'Total orders created',
      labelNames: ['tenantId'],
    }),
  ],
})
export class OrderModule {}

@Injectable()
export class OrderService {
  constructor(
    @InjectMetric('orders_created_total')
    private readonly ordersCreated: Counter<string>,
  ) {}

  create(tenantId: string) {
    this.ordersCreated.inc({ tenantId });
  }
}
```

## Scraping with Prometheus

Point a scrape job at each service's HTTP port and tag it with a
`service` label for cross-checking against `defaultLabels`:

```yaml
scrape_configs:
  - job_name: 'auth-ms'
    static_configs:
      - targets: ['<host>:<port>']
        labels: { service: auth-ms }
```

Useful PromQL for a Grafana dashboard aggregating all services:

```promql
# p95 latency per service/pattern
histogram_quantile(0.95, sum(rate(app_request_duration_seconds_bucket[5m])) by (le, service, pattern))

# error rate per service
sum(rate(app_requests_total{status="error"}[5m])) by (service)

# throughput per service
sum(rate(app_requests_total[5m])) by (service)
```
