/**
 * API Utilities
 *
 * Common patterns for API error handling and response parsing.
 */

export interface ApiError {
  error: string;
  message: string;
}

/**
 * Parse error response from API
 * Handles cases where the response body is not valid JSON
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  return response.json().catch(() => ({
    error: 'unknown',
    message: `Server error: ${response.status}`
  }));
}
