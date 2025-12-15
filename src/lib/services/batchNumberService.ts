/**
 * Batch Number Service
 *
 * Generates unique batch numbers following the format: BATCH-YYYYMMDD-NNN
 */

import { getTodayBatchCount } from '../repositories/batchRepo';

/**
 * Generate a new unique batch number
 *
 * Format: BATCH-YYYYMMDD-NNN
 * Example: BATCH-20251215-001
 */
export function generateBatchNumber(distributionCenterId: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Get count of batches already created today
  const todayCount = getTodayBatchCount(distributionCenterId);
  const nextNumber = todayCount + 1;
  const sequence = String(nextNumber).padStart(3, '0');

  return `BATCH-${dateStr}-${sequence}`;
}

/**
 * Parse a batch number to extract its components
 */
export function parseBatchNumber(batchNumber: string): {
  date: Date;
  sequence: number;
} | null {
  const match = batchNumber.match(/^BATCH-(\d{4})(\d{2})(\d{2})-(\d{3})$/);
  if (!match) return null;

  const [, year, month, day, seq] = match;
  if (!year || !month || !day || !seq) return null;

  return {
    date: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)),
    sequence: parseInt(seq)
  };
}

/**
 * Validate a batch number format
 */
export function isValidBatchNumber(batchNumber: string): boolean {
  return /^BATCH-\d{8}-\d{3}$/.test(batchNumber);
}
