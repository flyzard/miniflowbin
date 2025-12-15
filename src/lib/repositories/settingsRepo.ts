/**
 * Settings Repository
 *
 * Handles app settings (key-value store)
 */

import { exec, queryOne } from '../db/database';
import type { AppSettings } from '../types';

/**
 * Get a setting value by key
 */
export function getSetting(key: string): string | null {
  const result = queryOne<AppSettings>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key]
  );
  return result?.value ?? null;
}

/**
 * Set a setting value
 */
export function setSetting(key: string, value: string): void {
  exec(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

/**
 * Delete a setting
 */
export function deleteSetting(key: string): void {
  exec('DELETE FROM app_settings WHERE key = ?', [key]);
}

/**
 * Get the selected distribution center ID
 */
export function getSelectedDcId(): string | null {
  return getSetting('selected_dc_id');
}

/**
 * Set the selected distribution center ID
 */
export function setSelectedDcId(dcId: string): void {
  setSetting('selected_dc_id', dcId);
}

/**
 * Get the current user ID
 */
export function getCurrentUserId(): string | null {
  return getSetting('current_user_id');
}

/**
 * Set the current user ID
 */
export function setCurrentUserId(userId: string): void {
  setSetting('current_user_id', userId);
}
