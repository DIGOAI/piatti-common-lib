import { DynamicModule, Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { createLoggerConfig } from './logging.config';
import type {
  LoggingModuleAsyncOptions,
  LoggingModuleOptions,
} from './logging.types';

/**
 * Global logging module using Pino logger.
 *
 * This module configures the application-wide logging system with:
 * - HTTP request/response logging
 * - Custom serializers for sensitive data
 * - Request ID generation and tracking
 * - Environment-based log levels and formatting
 *
 * The module is configured globally and automatically intercepts
 * all HTTP requests to provide structured logging.
 *
 * @example
 * ```typescript
 * // Import with default configuration
 * @Module({
 *   imports: [LoggingModule.forRoot()],
 * })
 * export class AppModule {}
 *
 * // Import with custom configuration
 * @Module({
 *   imports: [
 *     LoggingModule.forRoot({
 *       logLevel: 'debug',
 *       prettyPrint: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // Import with async configuration
 * @Module({
 *   imports: [
 *     LoggingModule.forRootAsync({
 *       useFactory: (configService: ConfigService) => ({
 *         logLevel: configService.get('LOG_LEVEL'),
 *         prettyPrint: configService.get('LOG_PRETTY_PRINT'),
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class LoggingModule {
  /**
   * Configure the logging module with static options.
   *
   * @param options - Logging module configuration options
   * @returns Dynamic module configuration
   */
  static forRoot(options: LoggingModuleOptions = {}): DynamicModule {
    return {
      module: LoggingModule,
      imports: [LoggerModule.forRoot(createLoggerConfig(options))],
      exports: [LoggerModule],
    };
  }

  /**
   * Configure the logging module with async options.
   *
   * This method allows injecting dependencies (like ConfigService)
   * to dynamically create the logging configuration.
   *
   * @param options - Async configuration options
   * @returns Dynamic module configuration
   */
  static forRootAsync(options: LoggingModuleAsyncOptions = {}): DynamicModule {
    return {
      module: LoggingModule,
      imports: [
        LoggerModule.forRootAsync({
          useFactory: async (...args: any[]) => {
            const loggingOptions = options.useFactory
              ? // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                await options.useFactory(...args)
              : {};
            return createLoggerConfig(loggingOptions);
          },
          inject: options.inject || [],
        }),
      ],
      exports: [LoggerModule],
    };
  }
}
