/**
 * Layout Import Types
 * Types for CSV layout import feature
 */

import type { StoragePosition } from './index';

// ============================================================================
// CSV Parsing Types
// ============================================================================

/**
 * Raw CSV row as parsed from file
 */
export interface CsvPositionRow {
  zone: string;
  slot_code: string;
  aisle: string;
  column: string;
  level: string;
  capacity_units?: string;    // Ignored - not in schema
  max_weight_kg?: string;     // Ignored - not in schema
  status?: string;
  notes?: string;
}

/**
 * Validated and transformed position ready for DB operations
 */
export interface ImportPosition {
  code: string;               // From slot_code
  zone: string;
  aisle: string;
  rack: string;               // From column
  level: string;
  description: string | null; // From notes
  is_active: boolean;         // From status mapping
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation error for a specific row
 */
export interface CsvValidationError {
  row: number;                // 1-indexed row number (including header)
  field: string;
  message: string;
  value?: string;
}

/**
 * Overall CSV validation result
 */
export interface ImportValidationResult {
  valid: boolean;
  errors: CsvValidationError[];
  warnings: string[];         // Non-fatal issues (e.g., ignored fields)
  parsed: ImportPosition[];   // Successfully validated positions
}

// ============================================================================
// Preview Types
// ============================================================================

/**
 * Classification of what will happen to a position
 */
export type ImportAction = 'CREATE' | 'UPDATE' | 'KEEP' | 'UNCHANGED';

/**
 * Preview item showing what will happen to each position
 */
export interface ImportPreviewItem {
  position: ImportPosition;
  action: ImportAction;
  existingId?: string;        // For UPDATE/KEEP actions
  hasInventory?: boolean;     // For orphaned positions
  changes?: string[];         // List of field changes for UPDATE
}

/**
 * Summary of import preview
 */
export interface ImportPreviewSummary {
  creates: number;
  updates: number;
  unchanged: number;
  orphanedWithInventory: number;
  orphanedEmpty: number;
  items: ImportPreviewItem[];
}

// ============================================================================
// Execution Types
// ============================================================================

/**
 * User choice for orphaned positions (in DB, not in CSV)
 */
export type OrphanStrategy = 'keep' | 'mark_inactive' | 'delete';

/**
 * Result of import execution
 */
export interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  markedInactive: number;
  errors: string[];
}

// ============================================================================
// Flow State Types
// ============================================================================

/**
 * Import wizard step
 */
export type ImportStep = 'upload' | 'preview' | 'executing' | 'complete';

/**
 * Import flow state for the wizard
 */
export interface LayoutImportFlowState {
  step: ImportStep;
  fileName: string | null;
  rawCsv: string | null;
  validationResult: ImportValidationResult | null;
  preview: ImportPreviewSummary | null;
  orphanStrategy: OrphanStrategy;
  result: ImportResult | null;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Required CSV headers
 */
export const REQUIRED_HEADERS = ['zone', 'slot_code', 'aisle', 'column', 'level'] as const;

/**
 * All known CSV headers (required + optional)
 */
export const KNOWN_HEADERS = [
  ...REQUIRED_HEADERS,
  'capacity_units',
  'max_weight_kg',
  'status',
  'notes'
] as const;

/**
 * Valid status values and their is_active mapping
 */
export const STATUS_MAP: Record<string, boolean> = {
  'available': true,
  'occupied': true,
  'reserved': true,
  'maintenance': false
} as const;
