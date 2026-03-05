import type { Params } from 'nestjs-pino';

/**
 * Application types supported by the logging module.
 */
export type ApplicationType = 'http' | 'microservice' | 'hybrid';

/**
 * Available log levels for the logging module.
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug';

/**
 * Options for configuring the Logging module.
 */
export interface LoggingModuleOptions {
  /**
   * Log level (e.g., 'info', 'debug', 'error', 'warn')
   * @default 'info'
   */
  logLevel?: LogLevel;

  /**
   * Enable pretty printing for development
   * @default false
   */
  prettyPrint?: boolean;

  /**
   * Type of application (http, microservice, or hybrid)
   * - http: REST API with HTTP interceptors and request ID tracking
   * - microservice: NATS/gRPC/etc without HTTP interceptors
   * - hybrid: Both HTTP and microservice capabilities
   * @default 'http'
   */
  applicationType?: ApplicationType;

  /**
   * Routes to apply HTTP logging interceptor (only for http/hybrid types)
   * @default ['/*path']
   */
  forRoutes?: string[];
}

/**
 * Options for async configuration of the Logging module.
 */
export interface LoggingModuleAsyncOptions {
  /**
   * Factory function to create logging options
   */
  useFactory?: (
    ...args: any[]
  ) => Promise<LoggingModuleOptions> | LoggingModuleOptions;

  /**
   * Dependencies to inject into the factory function
   */
  inject?: any[];
}

/**
 * Type for Pino HTTP configuration
 */
export type PinoHttpConfig = Params;
