/**
 * FlowBin Type Definitions
 * Based on PRD Section 8: Data Model
 */

// ============================================================================
// Enums
// ============================================================================

export enum TransactionType {
  RECEIVE = 'RECEIVE',
  RELEASE = 'RELEASE',
  ADJUST = 'ADJUST'
}

export enum UserRole {
  ASSOCIATE = 'ASSOCIATE',
  CLERK = 'CLERK',
  SUPERVISOR = 'SUPERVISOR',
  MANAGER = 'MANAGER'
}

export enum ZoneType {
  GENERAL = 'General Storage',
  REFRIGERATED = 'Refrigerated',
  FROZEN = 'Frozen',
  QUARANTINE = 'Quarantine',
  SHIPPING = 'Shipping',
  RECEIVING = 'Receiving'
}

// ============================================================================
// Core Entities
// ============================================================================

export interface DistributionCenter {
  id: string;
  code: string;
  name: string;
  address: string | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string | null;
  description: string | null;
  category: string | null;
  color: string | null;
  size: string | null;
  unit_of_measure: string;
  distribution_center_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Optional inventory summary fields from queries
  position_count?: number;
  total_quantity?: number;
}

export interface StoragePosition {
  id: string;
  code: string;
  zone: string;
  zone_type: ZoneType | string | null;
  description: string | null;
  aisle: string | null;
  rack: string | null;
  level: string | null;
  distribution_center_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Optional inventory summary fields from queries
  batch_count?: number;
  total_quantity?: number;
}

export interface InventoryBatch {
  id: string;
  batch_number: string;
  product_id: string;
  position_id: string;
  quantity: number;
  original_quantity: number;
  received_at: string;
  received_by: string;
  expiration_date: string | null;
  lot_number: string | null;
  distribution_center_id: string;
  created_at: string;
  updated_at: string;
  // Optional joined fields from queries
  product_name?: string;
  product_sku?: string;
  position_code?: string;
  position_zone?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  product_id: string;
  batch_id: string | null;
  from_position_id: string | null;
  to_position_id: string | null;
  quantity: number;
  timestamp: string;
  user_id: string;
  distribution_center_id: string;
  notes: string | null;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  key: string;
  value: string;
}

// ============================================================================
// Flow State Types (for wizard flows)
// ============================================================================

export interface ReceiveFlowState {
  product: Product | null;
  quantity: number;
  position: StoragePosition | null;
  batchNumber: string | null;
}

export interface ReleaseFlowState {
  product: Product | null;
  sourceBatch: InventoryBatch | null;
  sourcePosition: StoragePosition | null;
  destinationPosition: StoragePosition | null;
}

// ============================================================================
// Layout Import Types
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
  capacity_units?: string;
  max_weight_kg?: string;
  status?: string;
  notes?: string;
}

/**
 * Validated and transformed position ready for DB operations
 */
export interface ImportPosition {
  code: string;
  zone: string;
  aisle: string;
  rack: string;
  level: string;
  description: string | null;
  is_active: boolean;
}

/**
 * Validation error for a specific row
 */
export interface CsvValidationError {
  row: number;
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
  warnings: string[];
  parsed: ImportPosition[];
}

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
  existingId?: string;
  hasInventory?: boolean;
  changes?: string[];
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

/**
 * User choice for orphaned positions
 */
export type OrphanStrategy = 'keep' | 'mark_inactive' | 'delete';

/**
 * Result of layout import execution
 */
export interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  markedInactive: number;
  errors: string[];
}

/**
 * Layout import wizard step
 */
export type ImportStep = 'upload' | 'preview' | 'executing' | 'complete';

/**
 * Layout import flow state
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

/**
 * Required layout CSV headers
 */
export const REQUIRED_HEADERS = ['zone', 'slot_code', 'aisle', 'column', 'level'] as const;

/**
 * All known layout CSV headers
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

// ============================================================================
// Product Import Types
// ============================================================================

/**
 * Raw CSV product row
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
 * Validated product ready for DB operations
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

/**
 * Product validation error
 */
export interface ProductValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

/**
 * Product CSV validation result
 */
export interface ProductValidationResult {
  valid: boolean;
  errors: ProductValidationError[];
  warnings: string[];
  parsed: ImportProduct[];
}

/**
 * Result of product import execution
 */
export interface ProductImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Product import wizard step
 */
export type ProductImportStep = 'upload' | 'executing' | 'complete';

/**
 * Product import flow state
 */
export interface ProductImportFlowState {
  step: ProductImportStep;
  fileName: string | null;
  rawCsv: string | null;
  validationResult: ProductValidationResult | null;
  result: ProductImportResult | null;
}

/**
 * Required product CSV headers
 */
export const PRODUCT_REQUIRED_HEADERS = ['sku'] as const;

/**
 * All known product CSV headers
 */
export const PRODUCT_KNOWN_HEADERS = [
  'sku',
  'name',
  'description',
  'category',
  'color',
  'size'
] as const;

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString();
}
