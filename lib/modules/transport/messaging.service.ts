import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { REQUEST_ID_METADATA_KEY } from '../logging/logging.constants';
import { getRequestId } from '../logging/logging.context';
import { TRANSPORT_CLIENT } from './transport.constants';

type PatternType = string | { cmd: string };

/**
 * Metadata to be sent with messages
 */
interface MessageMetadata {
  [REQUEST_ID_METADATA_KEY]?: string;
  [key: string]: any;
}

/**
 * Message payload with metadata
 */
interface MessageWithMetadata<T> {
  data: T;
  metadata: MessageMetadata;
}

@Injectable()
export class MessagingService {
  constructor(@Inject(TRANSPORT_CLIENT) private readonly client: ClientProxy) {}

  /**
   * Sends a message and waits for a response.
   * Automatically includes request ID in metadata for end-to-end tracing.
   *
   * @param pattern - Message pattern (string or object with cmd property)
   * @param data - Message payload
   * @param metadata - Optional additional metadata
   * @returns Observable of the response
   *
   * @example
   * ```typescript
   * this.messagingService
   *   .send('create_order', { orderId: '123' })
   *   .subscribe(result => console.log(result));
   * ```
   */
  send<TInput = any, TOutput = any>(
    pattern: PatternType,
    data: TInput,
    metadata?: Record<string, any>,
  ): Observable<TOutput> {
    const enrichedPayload = this.enrichWithMetadata(data, metadata);
    return this.client.send(pattern, enrichedPayload);
  }

  /**
   * Emits an event without waiting for a response.
   * Automatically includes request ID in metadata for end-to-end tracing.
   *
   * @param pattern - Event pattern (string or object with cmd property)
   * @param data - Event payload
   * @param metadata - Optional additional metadata
   * @returns Observable that completes when the event is emitted
   *
   * @example
   * ```typescript
   * this.messagingService
   *   .emit('order_created', { orderId: '123' })
   *   .subscribe();
   * ```
   */
  emit<TInput = any>(
    pattern: PatternType,
    data: TInput,
    metadata?: Record<string, any>,
  ): Observable<void> {
    const enrichedPayload = this.enrichWithMetadata(data, metadata);
    return this.client.emit(pattern, enrichedPayload);
  }

  /**
   * Enriches the message payload with metadata, including request ID
   * from the current async context.
   *
   * @param data - Original message data
   * @param additionalMetadata - Optional additional metadata
   * @returns Enriched payload with metadata
   */
  private enrichWithMetadata<T>(
    data: T,
    additionalMetadata?: Record<string, any>,
  ): MessageWithMetadata<T> {
    const requestId = getRequestId();
    const metadata: MessageMetadata = {
      ...additionalMetadata,
    };

    // Add request ID if available
    if (requestId) {
      metadata[REQUEST_ID_METADATA_KEY] = requestId;
    }

    return {
      data,
      metadata,
    };
  }
}
