/**
 * Product Import Service
 * Handles validation and execution of CSV product imports
 */

import { transaction } from '../db/database';
import { upsertProduct } from '../repositories/productRepo';
import { validateCsvContent, type CsvValidationConfig } from './csvValidationUtils';
import type {
  CsvProductRow,
  ImportProduct,
  ValidationError,
  ProductValidationResult,
  ProductImportResult
} from '../types';
import { PRODUCT_KNOWN_HEADERS, PRODUCT_REQUIRED_HEADERS } from '../types';

/**
 * Transform CSV row to ImportProduct
 */
function transformRow(row: CsvProductRow): ImportProduct {
  return {
    sku: row.sku.trim(),
    name: row.name?.trim() || null,
    description: row.description?.trim() || null,
    category: row.category?.trim() || null,
    color: row.color?.trim() || null,
    size: row.size?.trim() || null,
    unit_of_measure: 'EA'
  };
}

/**
 * Validate a single CSV row
 */
function validateRow(row: CsvProductRow, rowIndex: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!row.sku?.trim()) {
    errors.push({ row: rowIndex, field: 'sku', message: 'SKU is required' });
  }

  if (row.sku?.trim() && row.sku.trim().length > 50) {
    errors.push({
      row: rowIndex,
      field: 'sku',
      message: 'SKU must be 50 characters or less',
      value: row.sku
    });
  }

  return errors;
}

/**
 * Validation config for product CSV
 */
const productValidationConfig: CsvValidationConfig<CsvProductRow, ImportProduct> = {
  requiredHeaders: PRODUCT_REQUIRED_HEADERS,
  knownHeaders: PRODUCT_KNOWN_HEADERS,
  primaryKeyField: 'sku',
  transformRow,
  validateRow,
  duplicateKeyTransform: (key) => key.toUpperCase() // SKU is case-insensitive
};

/**
 * Validate entire CSV content
 */
export function validateProductCsv(csvContent: string): ProductValidationResult {
  return validateCsvContent(csvContent, productValidationConfig);
}

/**
 * Execute the product import
 */
export async function executeProductImport(
  validated: ImportProduct[],
  distributionCenterId: string
): Promise<ProductImportResult> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    await transaction(async () => {
      for (const product of validated) {
        try {
          const result = await upsertProduct(product, distributionCenterId);
          if (result === 'created') {
            created++;
          } else {
            updated++;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Error processing SKU "${product.sku}": ${message}`);
          skipped++;
        }
      }
    });

    return {
      success: errors.length === 0,
      created,
      updated,
      skipped,
      errors
    };
  } catch (err) {
    return {
      success: false,
      created: 0,
      updated: 0,
      skipped: validated.length,
      errors: [err instanceof Error ? err.message : 'Transaction failed']
    };
  }
}
