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

export enum ReleaseMode {
  SPECIFIC_QUANTITY = 'SPECIFIC_QUANTITY',
  FULL_BATCH = 'FULL_BATCH'
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
  name: string;
  description: string | null;
  category: string | null;
  unit_of_measure: string;
  distribution_center_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
// Joined / Computed Types
// ============================================================================

/** Batch with related product and position info */
export interface BatchWithDetails extends InventoryBatch {
  product_name: string;
  product_sku: string;
  position_code: string;
  position_zone: string;
}

/** Position with available inventory summary */
export interface PositionWithInventory extends StoragePosition {
  batch_count: number;
  total_quantity: number;
}

/** Product with inventory summary */
export interface ProductWithInventory extends Product {
  position_count: number;
  total_quantity: number;
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
  mode: ReleaseMode;
  quantity: number | null;
  sourceBatch: InventoryBatch | null;
  sourcePosition: StoragePosition | null;
  destinationPosition: StoragePosition | null;
}

// ============================================================================
// Utility Types
// ============================================================================

/** Generic search result with highlighted text */
export interface SearchResult<T> {
  item: T;
  matchedField: string;
  matchedText: string;
}

/** Pagination params */
export interface PaginationParams {
  limit: number;
  offset: number;
}

/** Generic list response with pagination */
export interface PaginatedList<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

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
