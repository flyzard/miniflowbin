/**
 * Storage Position Repository
 */

import { query, queryOne, exec, execBulkUpsert } from '../db/database';
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
 * Get positions available for receiving (excludes shipping/release positions)
 * Filters out positions with zone_type = 'SHIPPING' or 'OUTBOUND'
 */
export async function listReceivablePositions(distributionCenterId: string): Promise<StoragePosition[]> {
  return await query<StoragePosition>(
    `SELECT * FROM storage_positions
     WHERE distribution_center_id = ?
       AND is_active = 1
       AND (zone_type IS NULL OR zone_type NOT IN ('SHIPPING', 'OUTBOUND', 'Shipping'))
     ORDER BY zone, code`,
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
 * Get a position by its code within a distribution center (active only)
 */
export async function getPositionByCode(code: string, distributionCenterId: string): Promise<StoragePosition | null> {
  return await queryOne<StoragePosition>(
    'SELECT * FROM storage_positions WHERE code = ? AND distribution_center_id = ? AND is_active = 1',
    [code, distributionCenterId]
  );
}

/**
 * Get or create a shipping position for release destinations
 * Handles the case where position exists but is inactive (reactivates it)
 */
export async function getOrCreateShippingPosition(data: {
  code: string;
  zone: string;
  zoneType: string;
  description: string;
  distributionCenterId: string;
}): Promise<{ position: StoragePosition; wasCreated: boolean }> {
  const timestamp = now();

  // First, check if position exists (active or inactive)
  const existing = await queryOne<StoragePosition>(
    'SELECT * FROM storage_positions WHERE code = ? AND distribution_center_id = ?',
    [data.code, data.distributionCenterId]
  );

  if (existing) {
    // If inactive, reactivate it
    if (!existing.is_active) {
      await exec(
        `UPDATE storage_positions
         SET is_active = 1, zone = ?, zone_type = ?, description = ?, updated_at = ?
         WHERE id = ?`,
        [data.zone, data.zoneType, data.description, timestamp, existing.id]
      );
      const reactivated = await getPositionById(existing.id);
      return { position: reactivated!, wasCreated: false };
    }
    return { position: existing, wasCreated: false };
  }

  // Create new position
  const id = generateId();
  await exec(
    `INSERT INTO storage_positions
     (id, code, zone, zone_type, description, aisle, rack, level, distribution_center_id, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      data.code,
      data.zone,
      data.zoneType,
      data.description,
      null,
      null,
      null,
      data.distributionCenterId,
      timestamp,
      timestamp
    ]
  );

  const newPosition = await getPositionById(id);
  return { position: newPosition!, wasCreated: true };
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
 * Mark all positions as inactive for a distribution center
 * (Soft delete - preserves FK relationships with batches/transactions)
 */
export async function deactivatePositionsForDc(distributionCenterId: string): Promise<void> {
  await exec(
    'UPDATE storage_positions SET is_active = 0, updated_at = ? WHERE distribution_center_id = ?',
    [now(), distributionCenterId]
  );
}

/**
 * Upsert multiple positions (insert or update)
 * Positions from server are marked active; missing ones stay inactive
 * Uses bulk insert for performance (~50x faster than individual inserts)
 */
export async function upsertPositions(positions: Array<{
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
  if (positions.length === 0) return;

  const timestamp = now();

  const columns = [
    'id', 'code', 'zone', 'zone_type', 'description', 'aisle', 'rack', 'level',
    'distribution_center_id', 'is_active', 'created_at', 'updated_at'
  ];

  const rows = positions.map(p => [
    p.id,
    p.code,
    p.zone,
    p.zone_type ?? null,
    p.description ?? null,
    p.aisle ?? null,
    p.rack ?? null,
    p.level ?? null,
    p.distribution_center_id,
    1,
    timestamp,
    timestamp
  ]);

  const onConflict = `(id) DO UPDATE SET
    code = excluded.code,
    zone = excluded.zone,
    zone_type = excluded.zone_type,
    description = excluded.description,
    aisle = excluded.aisle,
    rack = excluded.rack,
    level = excluded.level,
    is_active = 1,
    updated_at = excluded.updated_at`;

  await execBulkUpsert('storage_positions', columns, rows, onConflict);
}
