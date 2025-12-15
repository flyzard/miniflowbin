import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseBatchNumber, isValidBatchNumber, generateBatchNumber } from '../batchNumberService';

// Mock the repository
vi.mock('../../repositories/batchRepo', () => ({
  getTodayBatchCount: vi.fn()
}));

import { getTodayBatchCount } from '../../repositories/batchRepo';

describe('batchNumberService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidBatchNumber', () => {
    it('should return true for valid batch numbers', () => {
      expect(isValidBatchNumber('BATCH-20251215-001')).toBe(true);
      expect(isValidBatchNumber('BATCH-20240101-999')).toBe(true);
      expect(isValidBatchNumber('BATCH-19990831-050')).toBe(true);
    });

    it('should return false for invalid batch numbers', () => {
      expect(isValidBatchNumber('')).toBe(false);
      expect(isValidBatchNumber('BATCH-2025121-001')).toBe(false); // Wrong date length
      expect(isValidBatchNumber('BATCH-20251215-01')).toBe(false); // Wrong sequence length
      expect(isValidBatchNumber('batch-20251215-001')).toBe(false); // Lowercase
      expect(isValidBatchNumber('BATCH20251215001')).toBe(false); // No dashes
      expect(isValidBatchNumber('BATCH-20251215-0001')).toBe(false); // Too many digits
      expect(isValidBatchNumber('LOT-20251215-001')).toBe(false); // Wrong prefix
    });
  });

  describe('parseBatchNumber', () => {
    it('should parse valid batch numbers correctly', () => {
      const result = parseBatchNumber('BATCH-20251215-042');
      expect(result).not.toBeNull();
      expect(result?.date.getFullYear()).toBe(2025);
      expect(result?.date.getMonth()).toBe(11); // December (0-indexed)
      expect(result?.date.getDate()).toBe(15);
      expect(result?.sequence).toBe(42);
    });

    it('should parse batch number with leading zeros', () => {
      const result = parseBatchNumber('BATCH-20250101-001');
      expect(result).not.toBeNull();
      expect(result?.date.getFullYear()).toBe(2025);
      expect(result?.date.getMonth()).toBe(0); // January
      expect(result?.date.getDate()).toBe(1);
      expect(result?.sequence).toBe(1);
    });

    it('should return null for invalid batch numbers', () => {
      expect(parseBatchNumber('')).toBeNull();
      expect(parseBatchNumber('invalid')).toBeNull();
      expect(parseBatchNumber('BATCH-2025-001')).toBeNull();
      expect(parseBatchNumber('BATCH-20251215-1')).toBeNull();
    });
  });

  describe('generateBatchNumber', () => {
    it('should generate batch number with correct format', () => {
      vi.mocked(getTodayBatchCount).mockReturnValue(0);

      const batchNumber = generateBatchNumber('dc-1');

      expect(batchNumber).toMatch(/^BATCH-\d{8}-001$/);
      expect(isValidBatchNumber(batchNumber)).toBe(true);
    });

    it('should increment sequence based on today count', () => {
      vi.mocked(getTodayBatchCount).mockReturnValue(5);

      const batchNumber = generateBatchNumber('dc-1');

      expect(batchNumber).toMatch(/^BATCH-\d{8}-006$/);
    });

    it('should pad sequence with zeros', () => {
      vi.mocked(getTodayBatchCount).mockReturnValue(99);

      const batchNumber = generateBatchNumber('dc-1');

      expect(batchNumber).toMatch(/^BATCH-\d{8}-100$/);
    });

    it('should include current date', () => {
      vi.mocked(getTodayBatchCount).mockReturnValue(0);

      const now = new Date();
      const expectedDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
      ].join('');

      const batchNumber = generateBatchNumber('dc-1');

      expect(batchNumber).toBe(`BATCH-${expectedDate}-001`);
    });
  });
});
