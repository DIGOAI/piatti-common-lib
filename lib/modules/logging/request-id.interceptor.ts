import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ulid } from 'ulid';
import { REQUEST_ID_METADATA_KEY } from './logging.constants';
import { runWithRequestId } from './logging.context';

/**
 * Interceptor that extracts request ID from NATS message metadata
 * and makes it available in the async context.
 *
 * This interceptor should be applied globally in microservices to enable
 * end-to-end request tracing from the gateway through all microservices.
 *
 * @example
 * ```typescript
 * // In main.ts of your microservice
 * import { NestFactory } from '@nestjs/core';
 * import { MicroserviceOptions, Transport } from '@nestjs/microservices';
 * import { RequestIdInterceptor } from '@piatti/common-lib';
 *
 * const app = await NestFactory.createMicroservice<MicroserviceOptions>(
 *   AppModule,
 *   {
 *     transport: Transport.NATS,
 *     options: { servers: ['nats://localhost:4222'] },
 *   },
 * );
 *
 * app.useGlobalInterceptors(new RequestIdInterceptor());
 * await app.listen();
 * ```
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const type = context.getType();

    // Only process microservice contexts (RPC/Message Queue)
    if (type !== 'rpc') {
      return next.handle();
    }

    // Extract request ID from message metadata
    const ctx = context.switchToRpc();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = ctx.getData();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const metadata = data?.metadata || {};

    // Get request ID from metadata or generate a new one
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const requestId =
      metadata[REQUEST_ID_METADATA_KEY] || (ulid().slice(0, 10) as string);

    // Run the handler with the request ID in context
    return new Observable((subscriber) => {
      runWithRequestId(requestId as string, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
