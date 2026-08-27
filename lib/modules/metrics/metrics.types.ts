/**
 * Configuration options for the MetricsModule.
 */
export interface MetricsModuleOptions {
  /**
   * HTTP path where the Prometheus scrape endpoint is exposed.
   * @default '/metrics'
   */
  path?: string;

  /**
   * Labels applied to every metric emitted by this process, e.g.
   * `{ service: 'auth-ms' }`. Essential when a single Prometheus/Grafana
   * instance aggregates metrics from several microservices, since it's
   * what lets dashboard queries group or filter by `service`.
   */
  defaultLabels?: Record<string, string>;

  /**
   * Whether to collect Node.js/process default metrics (CPU, memory,
   * event loop lag, GC, active handles, etc).
   * @default true
   */
  defaultMetricsEnabled?: boolean;

  /**
   * Histogram buckets (in seconds) used for the request/message
   * duration metric.
   * @default [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
   */
  buckets?: number[];
}
