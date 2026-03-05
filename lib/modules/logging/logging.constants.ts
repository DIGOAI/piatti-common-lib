/**
 * Constants for logging and request tracking
 */

/**
 * Header name for request ID in HTTP requests
 */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Metadata key for request ID in NATS messages
 */
export const REQUEST_ID_METADATA_KEY = 'x-request-id';

/**
 * AsyncLocalStorage key for request ID
 */
export const REQUEST_ID_TOKEN = Symbol('REQUEST_ID');
