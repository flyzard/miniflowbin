/**
 * CSV Parser Service
 * Wraps Papa Parse for type-safe CSV parsing
 */

import Papa from 'papaparse';
import type { CsvPositionRow, CsvProductRow } from '../types';
import { REQUIRED_HEADERS, PRODUCT_REQUIRED_HEADERS } from '../types';

// ============================================================================
// Generic Types and Functions
// ============================================================================

/**
 * Generic result of parsing a CSV file
 */
export interface CsvParseResult<T> {
  data: T[];
  errors: Papa.ParseError[];
  headers: string[];
}

/**
 * Generic CSV parsing function
 * @template T - The row type (e.g., CsvPositionRow, CsvProductRow)
 */
export function parseCsv<T>(csvContent: string): CsvParseResult<T> {
  const result = Papa.parse<T>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
    transform: (value) => value.trim()
  });

  return {
    data: result.data,
    errors: result.errors,
    headers: result.meta.fields ?? []
  };
}

/**
 * Generic header validation function
 */
export function validateCsvHeaders(
  headers: string[],
  requiredHeaders: readonly string[]
): { valid: boolean; missing: string[] } {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  const missing = requiredHeaders.filter(req => !normalizedHeaders.includes(req));
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Generic template CSV generation
 */
export interface CsvTemplateConfig {
  headers: string[];
  exampleRows: string[][];
}

export function generateCsvTemplate(config: CsvTemplateConfig): string {
  return Papa.unparse({
    fields: config.headers,
    data: config.exampleRows
  });
}

/**
 * Trigger a file download in the browser
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ============================================================================
// Layout CSV Functions (backward-compatible wrappers)
// ============================================================================

/** @deprecated Use CsvParseResult<CsvPositionRow> instead */
export type ParseResult = CsvParseResult<CsvPositionRow>;

/** Backward-compatible wrapper for parsing layout CSV */
export const parseLayoutCsv = (csvContent: string) => parseCsv<CsvPositionRow>(csvContent);

/** Backward-compatible wrapper for validating layout headers */
export const validateHeaders = (headers: string[]) => validateCsvHeaders(headers, REQUIRED_HEADERS);

/** Layout template configuration */
const LAYOUT_TEMPLATE_CONFIG: CsvTemplateConfig = {
  headers: ['zone', 'slot_code', 'aisle', 'column', 'level', 'capacity_units', 'max_weight_kg', 'status', 'notes'],
  exampleRows: [
    ['A', 'A-01-1', '1', '1', '1', '1', '500.00', 'available', 'Ground level slot'],
    ['A', 'A-01-2', '1', '1', '2', '1', '500.00', 'available', ''],
    ['B', 'B-01-1', '2', '1', '1', '2', '1000.00', 'available', 'Double capacity slot']
  ]
};

/** Backward-compatible wrapper for generating layout template */
export const generateTemplateCsv = () => generateCsvTemplate(LAYOUT_TEMPLATE_CONFIG);

// ============================================================================
// Product CSV Functions (backward-compatible wrappers)
// ============================================================================

/** @deprecated Use CsvParseResult<CsvProductRow> instead */
export type ProductParseResult = CsvParseResult<CsvProductRow>;

/** Backward-compatible wrapper for parsing product CSV */
export const parseProductCsv = (csvContent: string) => parseCsv<CsvProductRow>(csvContent);

/** Backward-compatible wrapper for validating product headers */
export const validateProductHeaders = (headers: string[]) => validateCsvHeaders(headers, PRODUCT_REQUIRED_HEADERS);

/** Product template configuration */
const PRODUCT_TEMPLATE_CONFIG: CsvTemplateConfig = {
  headers: ['sku', 'name', 'description', 'category', 'color', 'size'],
  exampleRows: [
    ['PROD-001', 'Example Product', 'Product description', 'Category A', 'Red', 'Large'],
    ['PROD-002', 'Another Product', 'Another description', 'Category B', 'Blue', 'Medium'],
    ['PROD-003', 'Third Product', '', 'Category A', '', 'Small']
  ]
};

/** Backward-compatible wrapper for generating product template */
export const generateProductTemplateCsv = () => generateCsvTemplate(PRODUCT_TEMPLATE_CONFIG);
