/**
 * Date formatting utilities
 */

/**
 * Get today's date as YYYY-MM-DD string
 * Used for database date comparisons
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

/**
 * Format date as YYYYMMDD (no separators)
 * Used for batch number generation
 */
export function formatDateCompact(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Pad a number with leading zeros
 * Used for sequence numbers in batch numbers
 */
export function padNumber(num: number, length: number): string {
  return String(num).padStart(length, '0');
}
