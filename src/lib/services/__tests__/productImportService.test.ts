/**
 * Product Import Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateProductCsv, executeProductImport } from '../productImportService';
import type { ImportProduct } from '../../types';

// Mock the database module
vi.mock('../../db/database', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  exec: vi.fn(),
  transaction: vi.fn((fn) => fn())
}));

// Mock the productRepo module
vi.mock('../../repositories/productRepo', () => ({
  upsertProduct: vi.fn()
}));

import { upsertProduct } from '../../repositories/productRepo';

describe('productImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateProductCsv', () => {
    it('should validate a CSV with all fields', () => {
      const csv = `sku,name,description,category,color,size
PROD-001,Product One,Description,Category A,Red,Large
PROD-002,Product Two,Another desc,Category B,Blue,Medium`;

      const result = validateProductCsv(csv);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.parsed).toHaveLength(2);
      expect(result.parsed[0]).toEqual({
        sku: 'PROD-001',
        name: 'Product One',
        description: 'Description',
        category: 'Category A',
        color: 'Red',
        size: 'Large',
        unit_of_measure: 'EA'
      });
    });

    it('should validate a CSV with only SKU (required field)', () => {
      const csv = `sku
PROD-001
PROD-002`;

      const result = validateProductCsv(csv);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.parsed).toHaveLength(2);
      expect(result.parsed[0]).toEqual({
        sku: 'PROD-001',
        name: null,
        description: null,
        category: null,
        color: null,
        size: null,
        unit_of_measure: 'EA'
      });
    });

    it('should fail when SKU header is missing', () => {
      const csv = `name,description
Product One,Description`;

      const result = validateProductCsv(csv);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toContain('Missing required headers');
      expect(result.errors[0]?.message).toContain('sku');
    });

    it('should fail when file is empty', () => {
      const csv = '';

      const result = validateProductCsv(csv);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toBe('File is empty');
    });

    it('should fail when only headers are present', () => {
      const csv = 'sku,name,description';

      const result = validateProductCsv(csv);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toBe('No data rows found (only headers)');
    });

    it('should fail when SKU is empty', () => {
      const csv = `sku,name,description
,Product One,Description`;

      const result = validateProductCsv(csv);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toBe('SKU is required');
    });

    it('should allow empty name field', () => {
      const csv = `sku,name,description
PROD-001,,Description`;

      const result = validateProductCsv(csv);

      expect(result.valid).toBe(true);
      expect(result.parsed[0]?.name).toBeNull();
    });

    it('should detect duplicate SKUs within the file', () => {
      const csv = `sku,name
PROD-001,Product One
PROD-001,Product Duplicate`;

      const result = validateProductCsv(csv);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toContain('Duplicate SKU');
    });

    it('should detect duplicate SKUs case-insensitively', () => {
      const csv = `sku,name
prod-001,Product One
PROD-001,Product Duplicate`;

      const result = validateProductCsv(csv);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toContain('Duplicate SKU');
    });

    it('should warn about unknown columns', () => {
      const csv = `sku,name,unknown_column
PROD-001,Product One,Unknown`;

      const result = validateProductCsv(csv);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Unknown columns will be ignored');
    });

    it('should fail when SKU is too long', () => {
      const longSku = 'A'.repeat(51);
      const csv = `sku,name
${longSku},Product One`;

      const result = validateProductCsv(csv);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toContain('50 characters or less');
    });

    it('should trim whitespace from values', () => {
      const csv = `sku,name,description
  PROD-001  ,  Product One  ,  Description  `;

      const result = validateProductCsv(csv);

      expect(result.valid).toBe(true);
      expect(result.parsed[0]?.sku).toBe('PROD-001');
      expect(result.parsed[0]?.name).toBe('Product One');
      expect(result.parsed[0]?.description).toBe('Description');
    });

    it('should handle empty optional fields as null', () => {
      const csv = `sku,name,description,category,color,size
PROD-001,Product One,,,,`;

      const result = validateProductCsv(csv);

      expect(result.valid).toBe(true);
      expect(result.parsed[0]?.description).toBeNull();
      expect(result.parsed[0]?.category).toBeNull();
      expect(result.parsed[0]?.color).toBeNull();
      expect(result.parsed[0]?.size).toBeNull();
    });
  });

  describe('executeProductImport', () => {
    it('should create new products', () => {
      const products: ImportProduct[] = [
        {
          sku: 'PROD-001',
          name: 'Product One',
          description: 'Description',
          category: 'Category A',
          color: 'Red',
          size: 'Large',
          unit_of_measure: 'EA'
        }
      ];

      vi.mocked(upsertProduct).mockReturnValue('created');

      const result = executeProductImport(products, 'dc-123');

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should update existing products', () => {
      const products: ImportProduct[] = [
        {
          sku: 'PROD-001',
          name: 'Product One',
          description: 'Description',
          category: 'Category A',
          color: 'Red',
          size: 'Large',
          unit_of_measure: 'EA'
        }
      ];

      vi.mocked(upsertProduct).mockReturnValue('updated');

      const result = executeProductImport(products, 'dc-123');

      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it('should handle mixed create and update', () => {
      const products: ImportProduct[] = [
        {
          sku: 'PROD-001',
          name: 'Product One',
          description: null,
          category: null,
          color: null,
          size: null,
          unit_of_measure: 'EA'
        },
        {
          sku: 'PROD-002',
          name: 'Product Two',
          description: null,
          category: null,
          color: null,
          size: null,
          unit_of_measure: 'EA'
        }
      ];

      vi.mocked(upsertProduct)
        .mockReturnValueOnce('created')
        .mockReturnValueOnce('updated');

      const result = executeProductImport(products, 'dc-123');

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
    });

    it('should handle errors during import', () => {
      const products: ImportProduct[] = [
        {
          sku: 'PROD-001',
          name: 'Product One',
          description: null,
          category: null,
          color: null,
          size: null,
          unit_of_measure: 'EA'
        }
      ];

      vi.mocked(upsertProduct).mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = executeProductImport(products, 'dc-123');

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Database error');
    });

    it('should return success true when no products to import', () => {
      const result = executeProductImport([], 'dc-123');

      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });
});
