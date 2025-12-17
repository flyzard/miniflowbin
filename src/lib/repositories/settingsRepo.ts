/**
 * Settings Repository
 *
 * Handles app settings (key-value store) and distribution centers
 */

import { exec, query, queryOne } from '../db/database';
import type { AppSettings, DistributionCenter } from '../types';
import { now } from '../types';

/**
 * Get a setting value by key
 */
export async function getSetting(key: string): Promise<string | null> {
  const result = await queryOne<AppSettings>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key]
  );
  return result?.value ?? null;
}

/**
 * Set a setting value
 */
export async function setSetting(key: string, value: string): Promise<void> {
  await exec(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

/**
 * Get the selected distribution center ID
 */
export async function getSelectedDcId(): Promise<string | null> {
  return await getSetting('selected_dc_id');
}

/**
 * Set the selected distribution center ID
 */
export async function setSelectedDcId(dcId: string): Promise<void> {
  await setSetting('selected_dc_id', dcId);
}

// ============================================================================
// Distribution Centers
// ============================================================================

/**
 * Get all active distribution centers
 */
export async function listActiveDistributionCenters(): Promise<DistributionCenter[]> {
  return await query<DistributionCenter>(
    'SELECT * FROM distribution_centers WHERE is_active = 1 ORDER BY name'
  );
}

/**
 * Get a distribution center by ID
 */
export async function getDistributionCenterById(id: string): Promise<DistributionCenter | null> {
  return await queryOne<DistributionCenter>(
    'SELECT * FROM distribution_centers WHERE id = ?',
    [id]
  );
}

/**
 * Upsert a distribution center (insert or update by ID)
 */
export async function upsertDistributionCenter(dc: {
  id: string;
  code: string;
  name: string;
  address?: string;
  timezone: string;
}): Promise<void> {
  const timestamp = now();
  await exec(
    `INSERT INTO distribution_centers (id, code, name, address, timezone, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       code = excluded.code,
       name = excluded.name,
       address = excluded.address,
       timezone = excluded.timezone,
       updated_at = excluded.updated_at`,
    [dc.id, dc.code, dc.name, dc.address ?? null, dc.timezone, timestamp, timestamp]
  );
}
