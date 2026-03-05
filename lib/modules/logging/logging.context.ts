import { AsyncLocalStorage } from 'async_hooks';
import { REQUEST_ID_TOKEN } from './logging.constants';

/**
 * AsyncLocalStorage for tracking request context across async operations
 */
export const requestContext = new AsyncLocalStorage<Map<symbol, any>>();

/**
 * Gets the current request ID from the async context.
 * Works in both HTTP and microservice contexts.
 *
 * @returns The request ID or undefined if not in a request context
 *
 * @example
 * ```typescript
 * const requestId = getRequestId();
 * this.logger.log('Processing', { requestId });
 * ```
 */
export function getRequestId(): string | undefined {
  const store = requestContext.getStore();
  return store?.get(REQUEST_ID_TOKEN) as string | undefined;
}

/**
 * Sets the request ID in the async context.
 *
 * @param requestId - The request ID to set
 *
 * @example
 * ```typescript
 * setRequestId('abc123');
 * ```
 */
export function setRequestId(requestId: string): void {
  const store = requestContext.getStore();
  if (store) {
    store.set(REQUEST_ID_TOKEN, requestId);
  }
}

/**
 * Runs a function with a request ID in the async context.
 *
 * @param requestId - The request ID to set for the duration of the callback
 * @param callback - The function to execute with the request ID set
 * @returns The result of the callback
 *
 * @example
 * ```typescript
 * await runWithRequestId('abc123', async () => {
 *   // All code here has access to the request ID
 *   const id = getRequestId(); // 'abc123'
 *   await processOrder();
 * });
 * ```
 */
export function runWithRequestId<T>(requestId: string, callback: () => T): T {
  const store = new Map<symbol, any>();
  store.set(REQUEST_ID_TOKEN, requestId);
  return requestContext.run(store, callback);
}
