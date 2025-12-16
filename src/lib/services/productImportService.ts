/**
 * Product Import Service
 * Handles validation and execution of CSV product imports
 */

import { transaction } from '../db/database';
import { parseProductCsv, validateProductHeaders } from './csvParserService';
import { upsertProduct } from '../repositories/productRepo';
import type {
  CsvProductRow,
  ImportProduct,
  ProductValidationError,
  ProductValidationResult,
  ProductImportResult
} from '../types';
import { PRODUCT_KNOWN_HEADERS } from '../types';

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
function validateRow(row: CsvProductRow, rowIndex: number): ProductValidationError[] {
  const errors: ProductValidationError[] = [];

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
 * Validate entire CSV content
 */
export function validateProductCsv(csvContent: string): ProductValidationResult {
  const errors: ProductValidationError[] = [];
  const warnings: string[] = [];

  if (!csvContent.trim()) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'File is empty'
    });
    return { valid: false, errors, warnings, parsed: [] };
  }

  const parseResult = parseProductCsv(csvContent);

  // Filter out the "Unable to auto-detect delimiting character" warning for single-column CSVs
  const actualErrors = parseResult.errors.filter(
    err => !err.message.includes('Unable to auto-detect delimiting character')
  );

  if (actualErrors.length > 0) {
    for (const err of actualErrors) {
      errors.push({
        row: err.row ?? 0,
        field: 'csv',
        message: err.message
      });
    }
    return { valid: false, errors, warnings, parsed: [] };
  }

  if (parseResult.data.length === 0) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'No data rows found (only headers)'
    });
    return { valid: false, errors, warnings, parsed: [] };
  }

  const headerValidation = validateProductHeaders(parseResult.headers);
  if (!headerValidation.valid) {
    errors.push({
      row: 1,
      field: 'headers',
      message: `Missing required headers: ${headerValidation.missing.join(', ')}`
    });
    return { valid: false, errors, warnings, parsed: [] };
  }

  const unknownHeaders = parseResult.headers.filter(
    h => !PRODUCT_KNOWN_HEADERS.includes(h.toLowerCase() as typeof PRODUCT_KNOWN_HEADERS[number])
  );
  if (unknownHeaders.length > 0) {
    warnings.push(`Unknown columns will be ignored: ${unknownHeaders.join(', ')}`);
  }

  const seenSkus = new Map<string, number>();
  const parsed: ImportProduct[] = [];

  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    if (!row) continue;

    const rowNumber = i + 2;
    const rowErrors = validateRow(row, rowNumber);
    errors.push(...rowErrors);

    if (row.sku?.trim()) {
      const sku = row.sku.trim().toUpperCase();
      const firstRow = seenSkus.get(sku);
      if (firstRow !== undefined) {
        errors.push({
          row: rowNumber,
          field: 'sku',
          message: `Duplicate SKU "${row.sku}" (first seen on row ${firstRow})`,
          value: row.sku
        });
      } else {
        seenSkus.set(sku, rowNumber);
      }
    }

    if (rowErrors.length === 0) {
      parsed.push(transformRow(row));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    parsed
  };
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
