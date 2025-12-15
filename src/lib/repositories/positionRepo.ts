/**
 * Storage Position Repository
 */

import { query, queryOne } from '../db/database';
import type { StoragePosition, PositionWithInventory } from '../types';

/**
 * Get all positions for a distribution center
 */
export function listPositions(distributionCenterId: string): StoragePosition[] {
  return query<StoragePosition>(
    'SELECT * FROM storage_positions WHERE distribution_center_id = ? AND is_active = 1 ORDER BY zone, code',
    [distributionCenterId]
  );
}

/**
 * Get a position by ID
 */
export function getPositionById(id: string): StoragePosition | null {
  return queryOne<StoragePosition>(
    'SELECT * FROM storage_positions WHERE id = ?',
    [id]
  );
}

/**
 * Get a position by code within a distribution center
 */
export function getPositionByCode(code: string, distributionCenterId: string): StoragePosition | null {
  return queryOne<StoragePosition>(
    'SELECT * FROM storage_positions WHERE code = ? AND distribution_center_id = ?',
    [code, distributionCenterId]
  );
}

/**
 * Search positions by code or zone
 */
export function searchPositions(searchTerm: string, distributionCenterId: string, limit: number = 50): StoragePosition[] {
  const term = `%${searchTerm}%`;
  return query<StoragePosition>(
    `SELECT * FROM storage_positions
     WHERE distribution_center_id = ?
       AND is_active = 1
       AND (code LIKE ? COLLATE NOCASE OR zone LIKE ? COLLATE NOCASE)
     ORDER BY
       CASE WHEN code LIKE ? COLLATE NOCASE THEN 0 ELSE 1 END,
       zone, code
     LIMIT ?`,
    [distributionCenterId, term, term, term, limit]
  );
}

/**
 * Get positions that contain a specific product (with batch info)
 */
export function listPositionsWithProduct(productId: string): PositionWithInventory[] {
  return query<PositionWithInventory>(
    `SELECT
       sp.*,
       COUNT(DISTINCT b.id) as batch_count,
       COALESCE(SUM(b.quantity), 0) as total_quantity
     FROM storage_positions sp
     INNER JOIN inventory_batches b ON b.position_id = sp.id AND b.product_id = ? AND b.quantity > 0
     WHERE sp.is_active = 1
     GROUP BY sp.id
     ORDER BY sp.zone, sp.code`,
    [productId]
  );
}

/**
 * Get all zones for a distribution center
 */
export function listZones(distributionCenterId: string): string[] {
  const results = query<{ zone: string }>(
    'SELECT DISTINCT zone FROM storage_positions WHERE distribution_center_id = ? AND is_active = 1 ORDER BY zone',
    [distributionCenterId]
  );
  return results.map(r => r.zone);
}
