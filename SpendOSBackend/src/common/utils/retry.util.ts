import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  logger?: Logger;
}

/**
 * Retry a function with exponential backoff
 * Specifically handles RPC rate limit errors (code -32007)
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    logger,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if this is a rate limit error
      const isRateLimitError =
        error.code === 'UNKNOWN_ERROR' &&
        error.error?.code === -32007;

      const isRpcError =
        error.code === 'UNKNOWN_ERROR' ||
        error.code === 'NETWORK_ERROR' ||
        error.code === 'TIMEOUT';

      // Only retry on RPC errors
      if (!isRpcError && !isRateLimitError) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      if (logger) {
        if (isRateLimitError) {
          logger.warn(
            `Rate limit hit. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
        } else {
          logger.warn(
            `RPC error: ${error.code}. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
        }
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  if (logger) {
    logger.error(`All ${maxRetries} retry attempts exhausted`);
  }
  throw lastError;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
