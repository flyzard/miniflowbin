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

export type SyncStatus = 'pending' | 'synced' | 'rejected';

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
  zone_type: string | null;
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
  // Sync tracking
  sync_status: SyncStatus;
  synced_at: string | null;
  sync_error: string | null;
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
  quantity: number | null;
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
