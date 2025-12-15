/**
 * CSV Parser Service
 * Wraps Papa Parse for type-safe CSV parsing
 */

import Papa from 'papaparse';
import type { CsvPositionRow } from '../types/layoutImport';
import { REQUIRED_HEADERS } from '../types/layoutImport';
import type { CsvProductRow } from '../types/productImport';
import { PRODUCT_REQUIRED_HEADERS } from '../types/productImport';

/**
 * Result of parsing a CSV file
 */
export interface ParseResult {
  data: CsvPositionRow[];
  errors: Papa.ParseError[];
  headers: string[];
}

/**
 * Parse CSV string into typed rows
 */
export function parseLayoutCsv(csvContent: string): ParseResult {
  const result = Papa.parse<CsvPositionRow>(csvContent, {
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
 * Validate that required CSV headers are present
 */
export function validateHeaders(headers: string[]): { valid: boolean; missing: string[] } {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  const missing = REQUIRED_HEADERS.filter(req => !normalizedHeaders.includes(req));
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Generate a template CSV content for download
 */
export function generateTemplateCsv(): string {
  const headers = ['zone', 'slot_code', 'aisle', 'column', 'level', 'capacity_units', 'max_weight_kg', 'status', 'notes'];
  const exampleRows = [
    ['A', 'A-01-1', '1', '1', '1', '1', '500.00', 'available', 'Ground level slot'],
    ['A', 'A-01-2', '1', '1', '2', '1', '500.00', 'available', ''],
    ['B', 'B-01-1', '2', '1', '1', '2', '1000.00', 'available', 'Double capacity slot']
  ];

  return Papa.unparse({
    fields: headers,
    data: exampleRows
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
// Product CSV Functions
// ============================================================================

/**
 * Result of parsing a product CSV file
 */
export interface ProductParseResult {
  data: CsvProductRow[];
  errors: Papa.ParseError[];
  headers: string[];
}

/**
 * Parse product CSV string into typed rows
 */
export function parseProductCsv(csvContent: string): ProductParseResult {
  const result = Papa.parse<CsvProductRow>(csvContent, {
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
 * Validate that required product CSV headers are present
 */
export function validateProductHeaders(headers: string[]): { valid: boolean; missing: string[] } {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  const missing = PRODUCT_REQUIRED_HEADERS.filter(req => !normalizedHeaders.includes(req));
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Generate a product template CSV content for download
 */
export function generateProductTemplateCsv(): string {
  const headers = ['sku', 'name', 'description', 'category', 'color', 'size'];
  const exampleRows = [
    ['PROD-001', 'Example Product', 'Product description', 'Category A', 'Red', 'Large'],
    ['PROD-002', 'Another Product', 'Another description', 'Category B', 'Blue', 'Medium'],
    ['PROD-003', 'Third Product', '', 'Category A', '', 'Small']
  ];

  return Papa.unparse({
    fields: headers,
    data: exampleRows
  });
}
