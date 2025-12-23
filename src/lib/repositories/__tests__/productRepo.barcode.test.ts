import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('../../db/database', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  exec: vi.fn(),
  execBulkUpsert: vi.fn(),
}));

import { getProductByBarcode } from '../productRepo';
import { queryOne } from '../../db/database';

describe('productRepo - barcode functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProductByBarcode', () => {
    const mockProduct = {
      id: 'product-1',
      sku: 'SKU-001',
      name: 'Test Product',
      description: 'A test product',
      category: 'Test Category',
      color: null,
      size: null,
      unit_of_measure: 'EA',
      barcode: '1234567890123',
      distribution_center_id: 'dc-1',
      is_active: true,
      created_at: '2025-12-01T00:00:00Z',
      updated_at: '2025-12-01T00:00:00Z',
    };

    it('should return product when barcode matches', async () => {
      vi.mocked(queryOne).mockResolvedValue(mockProduct);

      const result = await getProductByBarcode('1234567890123', 'dc-1');

      expect(result).toEqual(mockProduct);
      expect(queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE barcode = ?'),
        ['1234567890123', 'dc-1']
      );
    });

    it('should return null when barcode not found', async () => {
      vi.mocked(queryOne).mockResolvedValue(null);

      const result = await getProductByBarcode('nonexistent', 'dc-1');

      expect(result).toBeNull();
    });

    it('should use case-insensitive matching', async () => {
      vi.mocked(queryOne).mockResolvedValue(mockProduct);

      await getProductByBarcode('ABC123', 'dc-1');

      expect(queryOne).toHaveBeenCalledWith(
        expect.stringContaining('COLLATE NOCASE'),
        expect.any(Array)
      );
    });

    it('should only return active products', async () => {
      vi.mocked(queryOne).mockResolvedValue(mockProduct);

      await getProductByBarcode('1234567890123', 'dc-1');

      expect(queryOne).toHaveBeenCalledWith(
        expect.stringContaining('is_active = 1'),
        expect.any(Array)
      );
    });

    it('should filter by distribution center', async () => {
      vi.mocked(queryOne).mockResolvedValue(mockProduct);

      await getProductByBarcode('1234567890123', 'dc-2');

      expect(queryOne).toHaveBeenCalledWith(
        expect.stringContaining('distribution_center_id = ?'),
        ['1234567890123', 'dc-2']
      );
    });
  });
});
