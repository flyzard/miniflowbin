/**
 * Settings Repository
 *
 * Handles app settings (key-value store), users, and distribution centers
 */

import { exec, query, queryOne } from '../db/database';
import type { AppSettings, User, DistributionCenter } from '../types';

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

/**
 * Get the current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  return await getSetting('current_user_id');
}

/**
 * Set the current user ID
 */
export async function setCurrentUserId(userId: string): Promise<void> {
  await setSetting('current_user_id', userId);
}

// ============================================================================
// Users
// ============================================================================

/**
 * Get a user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  return await queryOne<User>(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
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
