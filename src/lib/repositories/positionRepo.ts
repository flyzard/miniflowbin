/**
 * Storage Position Repository
 */

import { query, queryOne, exec } from '../db/database';
import type { StoragePosition } from '../types';
import { generateId, now } from '../types';

/**
 * Get all positions for a distribution center
 */
export async function listPositions(distributionCenterId: string): Promise<StoragePosition[]> {
  return await query<StoragePosition>(
    'SELECT * FROM storage_positions WHERE distribution_center_id = ? AND is_active = 1 ORDER BY zone, code',
    [distributionCenterId]
  );
}

/**
 * Get a position by ID
 */
export async function getPositionById(id: string): Promise<StoragePosition | null> {
  return await queryOne<StoragePosition>(
    'SELECT * FROM storage_positions WHERE id = ?',
    [id]
  );
}

/**
 * Search positions by code or zone
 */
export async function searchPositions(searchTerm: string, distributionCenterId: string, limit: number = 50): Promise<StoragePosition[]> {
  const term = `%${searchTerm}%`;
  return await query<StoragePosition>(
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
 * Get a position by its code within a distribution center
 */
export async function getPositionByCode(code: string, distributionCenterId: string): Promise<StoragePosition | null> {
  return await queryOne<StoragePosition>(
    'SELECT * FROM storage_positions WHERE code = ? AND distribution_center_id = ? AND is_active = 1',
    [code, distributionCenterId]
  );
}

/**
 * Create a new storage position
 */
export async function createPosition(data: {
  code: string;
  zone: string;
  zoneType?: string;
  description?: string;
  distributionCenterId: string;
}): Promise<StoragePosition> {
  const id = generateId();
  const timestamp = now();

  await exec(
    `INSERT INTO storage_positions
     (id, code, zone, zone_type, description, aisle, rack, level, distribution_center_id, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      data.code,
      data.zone,
      data.zoneType ?? 'Shipping',
      data.description ?? `Release destination for ${data.code}`,
      null,
      null,
      null,
      data.distributionCenterId,
      timestamp,
      timestamp
    ]
  );

  return (await getPositionById(id))!;
}

// ============================================================================
// Bulk Import Operations
// ============================================================================

/**
 * Get all positions for a distribution center (including inactive)
 */
export async function listAllPositions(distributionCenterId: string): Promise<StoragePosition[]> {
  return await query<StoragePosition>(
    'SELECT * FROM storage_positions WHERE distribution_center_id = ? ORDER BY zone, code',
    [distributionCenterId]
  );
}

/**
 * Create a position with all fields (for bulk import)
 */
export async function createPositionBulk(data: {
  code: string;
  zone: string;
  aisle: string;
  rack: string;
  level: string;
  description: string | null;
  is_active: boolean;
  distributionCenterId: string;
}): Promise<StoragePosition> {
  const id = generateId();
  const timestamp = now();

  await exec(
    `INSERT INTO storage_positions
     (id, code, zone, zone_type, description, aisle, rack, level, distribution_center_id, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.code,
      data.zone,
      null, // zone_type not provided in CSV
      data.description,
      data.aisle,
      data.rack,
      data.level,
      data.distributionCenterId,
      data.is_active ? 1 : 0,
      timestamp,
      timestamp
    ]
  );

  return (await getPositionById(id))!;
}

/**
 * Update an existing position (for bulk import)
 */
export async function updatePositionBulk(id: string, data: {
  zone: string;
  aisle: string;
  rack: string;
  level: string;
  description: string | null;
  is_active: boolean;
}): Promise<void> {
  await exec(
    `UPDATE storage_positions
     SET zone = ?, aisle = ?, rack = ?, level = ?, description = ?, is_active = ?, updated_at = ?
     WHERE id = ?`,
    [data.zone, data.aisle, data.rack, data.level, data.description, data.is_active ? 1 : 0, now(), id]
  );
}

/**
 * Mark a position as inactive (soft delete)
 */
export async function markPositionInactive(id: string): Promise<void> {
  await exec(
    'UPDATE storage_positions SET is_active = 0, updated_at = ? WHERE id = ?',
    [now(), id]
  );
}

/**
 * Delete a position (hard delete - only use for empty positions)
 */
export async function deletePosition(id: string): Promise<void> {
  await exec('DELETE FROM storage_positions WHERE id = ?', [id]);
}

/**
 * Check if a position has inventory (batches with quantity > 0)
 */
export async function positionHasInventory(id: string): Promise<boolean> {
  const result = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM inventory_batches WHERE position_id = ? AND quantity > 0',
    [id]
  );
  return (result?.count ?? 0) > 0;
}
