/**
 * Error handling utilities
 */

/**
 * Safely extract error message from unknown error type
 * Used in service catch blocks
 */
export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error occurred';
}

/**
 * Log error with context label
 * Centralizes error logging format
 */
export function logError(context: string, message: string, error: unknown): void {
  console.error(`[${context}] ${message}:`, error);
}
