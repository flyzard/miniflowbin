/**
 * Inventory Batch Repository
 */

import { exec, query, queryOne } from '../db/database';
import type { InventoryBatch } from '../types';
import { generateId, now } from '../types';

/**
 * Get a batch by ID
 */
export async function getBatchById(id: string): Promise<InventoryBatch | null> {
  return await queryOne<InventoryBatch>(
    'SELECT * FROM inventory_batches WHERE id = ?',
    [id]
  );
}

/**
 * Get a batch by batch number
 */
export async function getBatchByNumber(batchNumber: string): Promise<InventoryBatch | null> {
  return await queryOne<InventoryBatch>(
    'SELECT * FROM inventory_batches WHERE batch_number = ?',
    [batchNumber]
  );
}

/**
 * Get all batches for a product
 */
export async function listBatchesByProduct(productId: string): Promise<InventoryBatch[]> {
  return await query<InventoryBatch>(
    'SELECT * FROM inventory_batches WHERE product_id = ? AND quantity > 0 ORDER BY received_at',
    [productId]
  );
}

/**
 * Get all batches at a position
 */
export async function listBatchesAtPosition(positionId: string): Promise<InventoryBatch[]> {
  return await query<InventoryBatch>(
    'SELECT * FROM inventory_batches WHERE position_id = ? AND quantity > 0 ORDER BY received_at',
    [positionId]
  );
}

/**
 * Get batches for a product with full details (product name, position code)
 */
export async function listBatchesWithDetails(productId: string): Promise<InventoryBatch[]> {
  return await query<InventoryBatch>(
    `SELECT
       b.*,
       p.name as product_name,
       p.sku as product_sku,
       sp.code as position_code,
       sp.zone as position_zone
     FROM inventory_batches b
     INNER JOIN products p ON p.id = b.product_id
     INNER JOIN storage_positions sp ON sp.id = b.position_id
     WHERE b.product_id = ? AND b.quantity > 0
     ORDER BY b.received_at ASC`,
    [productId]
  );
}

/**
 * Create a new batch
 */
export async function createBatch(data: {
  batchNumber: string;
  productId: string;
  positionId: string;
  quantity: number;
  receivedBy: string;
  distributionCenterId: string;
  expirationDate?: string;
  lotNumber?: string;
}): Promise<InventoryBatch> {
  const id = generateId();
  const timestamp = now();

  await exec(
    `INSERT INTO inventory_batches
     (id, batch_number, product_id, position_id, quantity, original_quantity, received_at, received_by, expiration_date, lot_number, distribution_center_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.batchNumber,
      data.productId,
      data.positionId,
      data.quantity,
      data.quantity,
      timestamp,
      data.receivedBy,
      data.expirationDate ?? null,
      data.lotNumber ?? null,
      data.distributionCenterId,
      timestamp,
      timestamp
    ]
  );

  return (await getBatchById(id))!;
}

/**
 * Update batch quantity
 */
export async function updateBatchQuantity(id: string, newQuantity: number): Promise<void> {
  await exec(
    'UPDATE inventory_batches SET quantity = ?, updated_at = ? WHERE id = ?',
    [newQuantity, now(), id]
  );
}

/**
 * Get total quantity of a product across all positions
 */
export async function getTotalProductQuantity(productId: string): Promise<number> {
  const result = await queryOne<{ total: number }>(
    'SELECT COALESCE(SUM(quantity), 0) as total FROM inventory_batches WHERE product_id = ?',
    [productId]
  );
  return result?.total ?? 0;
}

/**
 * Get available quantity at a specific position for a product
 */
export async function getQuantityAtPosition(productId: string, positionId: string): Promise<number> {
  const result = await queryOne<{ total: number }>(
    'SELECT COALESCE(SUM(quantity), 0) as total FROM inventory_batches WHERE product_id = ? AND position_id = ?',
    [productId, positionId]
  );
  return result?.total ?? 0;
}

/**
 * Get the count of batches created today (for batch number generation)
 */
export async function getTodayBatchCount(distributionCenterId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0] ?? ''; // YYYY-MM-DD
  const result = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM inventory_batches
     WHERE distribution_center_id = ?
     AND DATE(created_at) = ?`,
    [distributionCenterId, today]
  );
  return result?.count ?? 0;
}
