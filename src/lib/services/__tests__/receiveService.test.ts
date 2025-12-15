import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module first
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
  createBatch: vi.fn(),
  getTodayBatchCount: vi.fn()
}));

vi.mock('../../repositories/productRepo', () => ({
  getProductById: vi.fn()
}));

vi.mock('../../repositories/positionRepo', () => ({
  getPositionById: vi.fn()
}));

vi.mock('../../repositories/transactionRepo', () => ({
  createTransaction: vi.fn()
}));

// Import after mocking
import { validateReceive, generateBatchNumber } from '../receiveService';
import { getProductById } from '../../repositories/productRepo';
import { getPositionById } from '../../repositories/positionRepo';
import { getTodayBatchCount } from '../../repositories/batchRepo';

describe('receiveService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateReceive', () => {
    const mockProduct = {
      id: 'product-1',
      sku: 'SKU-001',
      name: 'Test Product',
      description: 'A test product',
      category: 'Test Category',
      color: null,
      size: null,
      unit_of_measure: 'units',
      distribution_center_id: 'dc-1',
      is_active: true,
      created_at: '2025-12-01T00:00:00Z',
      updated_at: '2025-12-01T00:00:00Z'
    };

    const mockPosition = {
      id: 'position-1',
      code: 'A-01',
      zone: 'Zone A',
      zone_type: 'General Storage',
      description: 'Test position',
      aisle: 'A',
      rack: '01',
      level: '1',
      distribution_center_id: 'dc-1',
      is_active: true,
      created_at: '2025-12-01T00:00:00Z',
      updated_at: '2025-12-01T00:00:00Z'
    };

    const validInput = {
      productId: 'product-1',
      positionId: 'position-1',
      quantity: 100,
      userId: 'user-1',
      distributionCenterId: 'dc-1'
    };

    it('should validate a valid receive request', () => {
      vi.mocked(getProductById).mockReturnValue(mockProduct);
      vi.mocked(getPositionById).mockReturnValue(mockPosition);

      const result = validateReceive(validInput);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when product is not found', () => {
      vi.mocked(getProductById).mockReturnValue(null);
      vi.mocked(getPositionById).mockReturnValue(mockPosition);

      const result = validateReceive(validInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Product not found');
    });

    it('should fail when product is inactive', () => {
      vi.mocked(getProductById).mockReturnValue({ ...mockProduct, is_active: false });
      vi.mocked(getPositionById).mockReturnValue(mockPosition);

      const result = validateReceive(validInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Product is not active');
    });

    it('should fail when position is not found', () => {
      vi.mocked(getProductById).mockReturnValue(mockProduct);
      vi.mocked(getPositionById).mockReturnValue(null);

      const result = validateReceive(validInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Storage position not found');
    });

    it('should fail when position is inactive', () => {
      vi.mocked(getProductById).mockReturnValue(mockProduct);
      vi.mocked(getPositionById).mockReturnValue({ ...mockPosition, is_active: false });

      const result = validateReceive(validInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Storage position is not active');
    });

    it('should fail for zero quantity', () => {
      vi.mocked(getProductById).mockReturnValue(mockProduct);
      vi.mocked(getPositionById).mockReturnValue(mockPosition);

      const result = validateReceive({ ...validInput, quantity: 0 });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('positive integer'))).toBe(true);
    });

    it('should fail for negative quantity', () => {
      vi.mocked(getProductById).mockReturnValue(mockProduct);
      vi.mocked(getPositionById).mockReturnValue(mockPosition);

      const result = validateReceive({ ...validInput, quantity: -5 });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('positive integer'))).toBe(true);
    });

    it('should fail when user ID is missing', () => {
      vi.mocked(getProductById).mockReturnValue(mockProduct);
      vi.mocked(getPositionById).mockReturnValue(mockPosition);

      const result = validateReceive({ ...validInput, userId: '' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('User ID is required');
    });

    it('should fail when distribution center ID is missing', () => {
      vi.mocked(getProductById).mockReturnValue(mockProduct);
      vi.mocked(getPositionById).mockReturnValue(mockPosition);

      const result = validateReceive({ ...validInput, distributionCenterId: '' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Distribution center ID is required');
    });
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
