import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module first (must be before importing anything that uses it)
vi.mock('../../db/database', () => ({
  getDatabase: vi.fn(),
  initDatabase: vi.fn(),
  query: vi.fn(),
  queryOne: vi.fn(),
  exec: vi.fn(),
  insert: vi.fn(),
  transaction: vi.fn()
}));

// Mock the repositories
vi.mock('../../repositories/batchRepo', () => ({
  getBatchById: vi.fn(),
  decreaseBatchQuantity: vi.fn(),
  updateBatchQuantity: vi.fn()
}));

vi.mock('../../repositories/positionRepo', () => ({
  getPositionById: vi.fn()
}));

vi.mock('../../repositories/transactionRepo', () => ({
  createTransaction: vi.fn()
}));

// Import after mocking
import { validateRelease } from '../releaseService';
import { getBatchById } from '../../repositories/batchRepo';
import { getPositionById } from '../../repositories/positionRepo';

describe('releaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateRelease', () => {
    const mockBatch = {
      id: 'batch-1',
      batch_number: 'BATCH-20251215-001',
      product_id: 'product-1',
      position_id: 'position-1',
      quantity: 100,
      original_quantity: 100,
      received_at: '2025-12-15T10:00:00Z',
      received_by: 'user-1',
      expiration_date: null,
      lot_number: null,
      distribution_center_id: 'dc-1',
      created_at: '2025-12-15T10:00:00Z',
      updated_at: '2025-12-15T10:00:00Z'
    };

    const mockPosition = {
      id: 'position-2',
      code: 'A-02',
      zone: 'Zone A',
      zone_type: 'General Storage',
      description: 'Test position',
      aisle: 'A',
      rack: '02',
      level: '1',
      distribution_center_id: 'dc-1',
      is_active: true,
      created_at: '2025-12-01T00:00:00Z',
      updated_at: '2025-12-01T00:00:00Z'
    };

    const validInput = {
      batchId: 'batch-1',
      quantity: 100, // Full batch quantity
      destinationPositionId: 'position-2',
      userId: 'user-1',
      distributionCenterId: 'dc-1'
    };

    it('should validate a valid release request', () => {
      vi.mocked(getBatchById).mockReturnValue(mockBatch);
      vi.mocked(getPositionById).mockReturnValue(mockPosition);

      const result = validateRelease(validInput);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.batch).toEqual(mockBatch);
    });

    it('should fail when batch is not found', () => {
      vi.mocked(getBatchById).mockReturnValue(null);
      vi.mocked(getPositionById).mockReturnValue(mockPosition);

      const result = validateRelease(validInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Batch not found');
    });

    it('should fail when batch has no quantity', () => {
      vi.mocked(getBatchById).mockReturnValue({ ...mockBatch, quantity: 0 });
      vi.mocked(getPositionById).mockReturnValue(mockPosition);

      const result = validateRelease(validInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Batch has no available quantity');
    });

    it('should fail when destination position is not found', () => {
      vi.mocked(getBatchById).mockReturnValue(mockBatch);
      vi.mocked(getPositionById).mockReturnValue(null);

      const result = validateRelease(validInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Destination position not found');
    });

    it('should fail when destination position is inactive', () => {
      vi.mocked(getBatchById).mockReturnValue(mockBatch);
      vi.mocked(getPositionById).mockReturnValue({ ...mockPosition, is_active: false });

      const result = validateRelease(validInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Destination position is not active');
    });

    it('should fail when user ID is missing', () => {
      vi.mocked(getBatchById).mockReturnValue(mockBatch);
      vi.mocked(getPositionById).mockReturnValue(mockPosition);

      const result = validateRelease({ ...validInput, userId: '' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('User ID is required');
    });
  });
});
