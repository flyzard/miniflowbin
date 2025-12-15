/**
 * Storage Position Repository
 */

import { query, queryOne, exec } from '../db/database';
import type { StoragePosition } from '../types';
import { generateId, now } from '../types';

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
 * Get a position by its code within a distribution center
 */
export function getPositionByCode(code: string, distributionCenterId: string): StoragePosition | null {
  return queryOne<StoragePosition>(
    'SELECT * FROM storage_positions WHERE code = ? AND distribution_center_id = ? AND is_active = 1',
    [code, distributionCenterId]
  );
}

/**
 * Create a new storage position
 */
export function createPosition(data: {
  code: string;
  zone: string;
  zoneType?: string;
  description?: string;
  distributionCenterId: string;
}): StoragePosition {
  const id = generateId();
  const timestamp = now();

  exec(
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

  return getPositionById(id)!;
}
