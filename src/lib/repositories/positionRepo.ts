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

/**
 * Clear all positions for a distribution center
 */
export async function clearPositionsForDc(distributionCenterId: string): Promise<void> {
  await exec(
    'DELETE FROM storage_positions WHERE distribution_center_id = ?',
    [distributionCenterId]
  );
}

/**
 * Insert multiple positions (batch insert)
 */
export async function insertPositions(positions: Array<{
  id: string;
  code: string;
  zone: string;
  zone_type?: string;
  description?: string;
  aisle?: string;
  rack?: string;
  level?: string;
  distribution_center_id: string;
}>): Promise<void> {
  const timestamp = now();

  for (const position of positions) {
    await exec(
      `INSERT INTO storage_positions (id, code, zone, zone_type, description, aisle, rack, level, distribution_center_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        position.id,
        position.code,
        position.zone,
        position.zone_type ?? null,
        position.description ?? null,
        position.aisle ?? null,
        position.rack ?? null,
        position.level ?? null,
        position.distribution_center_id,
        timestamp,
        timestamp
      ]
    );
  }
}
