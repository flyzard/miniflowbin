import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateBatchNumber } from '../batchNumberService';

// Mock the repository
vi.mock('../../repositories/batchRepo', () => ({
  getTodayBatchCount: vi.fn()
}));

import { getTodayBatchCount } from '../../repositories/batchRepo';

describe('batchNumberService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateBatchNumber', () => {
    it('should generate batch number with correct format', () => {
      vi.mocked(getTodayBatchCount).mockReturnValue(0);

      const batchNumber = generateBatchNumber('dc-1');

      expect(batchNumber).toMatch(/^BATCH-\d{8}-001$/);
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
