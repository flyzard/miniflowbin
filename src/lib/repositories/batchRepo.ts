/**
 * Inventory Batch Repository
 */

import { exec, query, queryOne } from '../db/database';
import type { InventoryBatch } from '../types';
import { generateId, now } from '../types';
import { getTodayDate } from '../utils/date';

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
     WHERE b.product_id = ? AND b.quantity > 0 AND b.is_active = 1
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
 * Get the max sequence number for today's batches (for batch number generation)
 * Queries by batch_number prefix to include synced batches
 */
export async function getTodayBatchCount(distributionCenterId: string): Promise<number> {
  const today = getTodayDate().replace(/-/g, ''); // Convert YYYY-MM-DD to YYYYMMDD
  const prefix = `BATCH-${today}-%`;
  const result = await queryOne<{ max_seq: number | null }>(
    `SELECT MAX(CAST(SUBSTR(batch_number, -3) AS INTEGER)) as max_seq
     FROM inventory_batches
     WHERE distribution_center_id = ?
     AND batch_number LIKE ?`,
    [distributionCenterId, prefix]
  );
  return result?.max_seq ?? 0;
}

// ============================================================================
// Sync Functions
// ============================================================================

/**
 * Get batch by batch_number (for sync correlation)
 */
export async function getBatchByNumber(batchNumber: string): Promise<InventoryBatch | null> {
  return await queryOne<InventoryBatch>(
    'SELECT * FROM inventory_batches WHERE batch_number = ?',
    [batchNumber]
  );
}

/**
 * Mark all batches as inactive for a distribution center
 * (Soft delete - preserves FK relationships with transactions)
 */
export async function deactivateBatchesForDc(distributionCenterId: string): Promise<void> {
  await exec(
    'UPDATE inventory_batches SET is_active = 0, updated_at = ? WHERE distribution_center_id = ?',
    [now(), distributionCenterId]
  );
}

/**
 * Upsert multiple batches (for sync down)
 * Batches from server are marked active; missing ones stay inactive
 */
export async function upsertBatches(batches: Array<{
  id: string;
  batchNumber: string;
  productId: string;
  positionId: string;
  quantity: number;
  originalQuantity: number;
  receivedAt: string;
  receivedBy: string;
  distributionCenterId: string;
  expirationDate?: string;
  lotNumber?: string;
}>): Promise<void> {
  const timestamp = now();

  for (const batch of batches) {
    await exec(
      `INSERT INTO inventory_batches
       (id, batch_number, product_id, position_id, quantity, original_quantity, received_at, received_by, expiration_date, lot_number, distribution_center_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         batch_number = excluded.batch_number,
         product_id = excluded.product_id,
         position_id = excluded.position_id,
         quantity = excluded.quantity,
         original_quantity = excluded.original_quantity,
         received_at = excluded.received_at,
         received_by = excluded.received_by,
         expiration_date = excluded.expiration_date,
         lot_number = excluded.lot_number,
         is_active = 1,
         updated_at = excluded.updated_at`,
      [
        batch.id,
        batch.batchNumber,
        batch.productId,
        batch.positionId,
        batch.quantity,
        batch.originalQuantity,
        batch.receivedAt,
        batch.receivedBy,
        batch.expirationDate ?? null,
        batch.lotNumber ?? null,
        batch.distributionCenterId,
        timestamp,
        timestamp
      ]
    );
  }
}
