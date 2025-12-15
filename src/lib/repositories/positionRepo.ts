/**
 * Storage Position Repository
 */

import { query, queryOne } from '../db/database';
import type { StoragePosition } from '../types';

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
