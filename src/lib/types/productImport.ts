/**
 * Product Import Types
 * Types for CSV product import feature
 */

// ============================================================================
// CSV Parsing Types
// ============================================================================

/**
 * Raw CSV row as parsed from file
 */
export interface CsvProductRow {
  sku: string;
  name?: string;
  description?: string;
  category?: string;
  color?: string;
  size?: string;
}

/**
 * Validated and transformed product ready for DB operations
 */
export interface ImportProduct {
  sku: string;
  name: string | null;
  description: string | null;
  category: string | null;
  color: string | null;
  size: string | null;
  unit_of_measure: string;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation error for a specific row
 */
export interface ProductValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

/**
 * Overall CSV validation result
 */
export interface ProductValidationResult {
  valid: boolean;
  errors: ProductValidationError[];
  warnings: string[];
  parsed: ImportProduct[];
}

// ============================================================================
// Execution Types
// ============================================================================

/**
 * Result of import execution
 */
export interface ProductImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ============================================================================
// Flow State Types
// ============================================================================

/**
 * Import wizard step
 */
export type ProductImportStep = 'upload' | 'executing' | 'complete';

/**
 * Import flow state
 */
export interface ProductImportFlowState {
  step: ProductImportStep;
  fileName: string | null;
  rawCsv: string | null;
  validationResult: ProductValidationResult | null;
  result: ProductImportResult | null;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Required CSV headers
 */
export const PRODUCT_REQUIRED_HEADERS = ['sku'] as const;

/**
 * All known CSV headers (required + optional)
 */
export const PRODUCT_KNOWN_HEADERS = [
  'sku',
  'name',
  'description',
  'category',
  'color',
  'size'
] as const;
