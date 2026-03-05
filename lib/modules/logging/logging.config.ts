import type { Params } from 'nestjs-pino';
import { ulid } from 'ulid';
import { getRequestId, setRequestId } from './logging.context';
import { httpReqSerializer, httpResSerializer } from './logging.serializers';
import type { LoggingModuleOptions } from './logging.types';

/**
 * Default logging configuration values
 */
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_PRETTY_PRINT = false;
const DEFAULT_APPLICATION_TYPE = 'http';
const DEFAULT_FOR_ROUTES = ['/*path'];

/**
 * Creates base Pino configuration (common for all app types)
 */
function createBaseConfig(options: LoggingModuleOptions) {
  const { logLevel = DEFAULT_LOG_LEVEL, prettyPrint = DEFAULT_PRETTY_PRINT } =
    options;

  return {
    level: logLevel,
    formatters: {
      level(label: string) {
        return { level: label.toUpperCase() };
      },
    },
    transport: prettyPrint
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  };
}

/**
 * Creates HTTP-specific Pino configuration for REST APIs and Gateways.
 *
 * Includes HTTP interceptors, request/response serializers, and request ID tracking.
 */
function createHttpConfig(options: LoggingModuleOptions): Params {
  const { forRoutes = DEFAULT_FOR_ROUTES } = options;
  const baseConfig = createBaseConfig(options);

  return {
    forRoutes,
    pinoHttp: {
      ...baseConfig,
      quietReqLogger: true,

      // Custom messages for different scenarios
      customErrorMessage: (error) =>
        error.errored?.message || 'Request errored',
      customSuccessMessage: () => 'Request completed',

      // Dynamic log level based on response status
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },

      // Add context to all HTTP logs
      customProps: () => ({
        context: 'HttpAccess',
      }),

      // Custom serializers for request/response objects
      serializers: {
        req: httpReqSerializer,
        res: httpResSerializer,
      },

      // Generate unique request IDs
      genReqId: (req, res) => {
        const existingId = req.id ?? (req.headers['x-request-id'] as string);
        if (existingId) {
          // Store request ID in async context for microservice calls
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          setRequestId(String(existingId));
          return existingId;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const id = ulid().slice(0, 10);
        // Store request ID in async context
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        setRequestId(id);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        res.setHeader('X-Request-Id', id);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return id;
      },
    },
  };
}

/**
 * Creates microservice-specific Pino configuration for NATS/gRPC/etc.
 *
 * Uses basic logging without HTTP interceptors, suitable for message-based
 * microservices where there are no HTTP requests/responses.
 * Includes request ID from async context in all logs for end-to-end tracing.
 */
function createMicroserviceConfig(options: LoggingModuleOptions): Params {
  const baseConfig = createBaseConfig(options);

  return {
    pinoHttp: {
      ...baseConfig,
      // Basic configuration without HTTP-specific features
      customProps: () => {
        const requestId = getRequestId();
        return {
          context: 'Microservice',
          ...(requestId && { requestId }),
        };
      },
    },
  };
}

/**
 * Creates the Pino logger configuration based on provided options.
 *
 * This factory function generates the complete LoggerModule configuration,
 * adapting to the application type (HTTP, microservice, or hybrid).
 *
 * @param options - Logging module configuration options
 * @returns Pino HTTP configuration object
 *
 * @example
 * ```typescript
 * // For HTTP API (Gateway)
 * LoggerModule.forRootAsync({
 *   useFactory: (configService: ConfigService) =>
 *     createLoggerConfig({
 *       logLevel: configService.get('LOG_LEVEL'),
 *       applicationType: 'http',
 *       prettyPrint: configService.get('NODE_ENV') === 'development',
 *     }),
 *   inject: [ConfigService],
 * })
 *
 * // For Microservice with NATS
 * LoggerModule.forRootAsync({
 *   useFactory: (configService: ConfigService) =>
 *     createLoggerConfig({
 *       logLevel: configService.get('LOG_LEVEL'),
 *       applicationType: 'microservice',
 *       prettyPrint: configService.get('NODE_ENV') === 'development',
 *     }),
 *   inject: [ConfigService],
 * })
 *
 * // For Hybrid (HTTP + Microservice)
 * LoggerModule.forRootAsync({
 *   useFactory: (configService: ConfigService) =>
 *     createLoggerConfig({
 *       logLevel: configService.get('LOG_LEVEL'),
 *       applicationType: 'hybrid',
 *     }),
 *   inject: [ConfigService],
 * })
 * ```
 */
export function createLoggerConfig(options: LoggingModuleOptions = {}): Params {
  const { applicationType = DEFAULT_APPLICATION_TYPE } = options;

  switch (applicationType) {
    case 'microservice':
      return createMicroserviceConfig(options);
    case 'http':
    case 'hybrid':
    default:
      return createHttpConfig(options);
  }
}
