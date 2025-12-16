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
