/**
 * Auth Repository
 *
 * Database operations for device credentials, auth users, and sessions.
 */

import { exec, query, queryOne, transaction } from '../db/database';
import { CLEAR_INVENTORY_DATA_SQL } from '../db/schema';
import { generateId, now } from '../types';
import type { DeviceCredentials, AuthUser, AuthSession } from './types';

// ─────────────────────────────────────────────────────────────
// Device Credentials
// ─────────────────────────────────────────────────────────────

/**
 * Get stored device credentials
 */
export async function getDeviceCredentials(): Promise<DeviceCredentials | null> {
  return await queryOne<DeviceCredentials>(
    'SELECT * FROM device_credentials LIMIT 1'
  );
}

/**
 * Save device credentials (replaces existing)
 */
export async function saveDeviceCredentials(credentials: {
  device_id: string;
  device_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  refresh_expires_at: string;
}): Promise<void> {
  const timestamp = now();

  await transaction(async () => {
    // Clear existing credentials
    await exec('DELETE FROM device_credentials');

    // Insert new credentials
    await exec(
      `INSERT INTO device_credentials (
        device_id, device_token_encrypted, refresh_token_encrypted,
        token_expires_at, refresh_expires_at, activated_at, last_sync_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        credentials.device_id,
        credentials.device_token_encrypted,
        credentials.refresh_token_encrypted,
        credentials.token_expires_at,
        credentials.refresh_expires_at,
        timestamp,
        timestamp
      ]
    );
  });
}

/**
 * Update device credentials (tokens only)
 */
export async function updateDeviceCredentials(update: {
  device_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  refresh_expires_at: string;
}): Promise<void> {
  await exec(
    `UPDATE device_credentials SET
      device_token_encrypted = ?,
      refresh_token_encrypted = ?,
      token_expires_at = ?,
      refresh_expires_at = ?,
      last_sync_at = ?`,
    [
      update.device_token_encrypted,
      update.refresh_token_encrypted,
      update.token_expires_at,
      update.refresh_expires_at,
      now()
    ]
  );
}

/**
 * Update last sync timestamp
 */
export async function updateLastSync(): Promise<void> {
  await exec(
    'UPDATE device_credentials SET last_sync_at = ?',
    [now()]
  );
}

/**
 * Delete all device credentials
 */
export async function clearDeviceCredentials(): Promise<void> {
  await exec('DELETE FROM device_credentials');
}

// ─────────────────────────────────────────────────────────────
// Auth Users (extended users table)
// ─────────────────────────────────────────────────────────────

/**
 * Get auth user by ID
 */
export async function getAuthUserById(id: string): Promise<AuthUser | null> {
  return await queryOne<AuthUser>(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
}

/**
 * Get auth user by remote ID (server user ID)
 */
export async function getAuthUserByRemoteId(remoteId: number): Promise<AuthUser | null> {
  return await queryOne<AuthUser>(
    'SELECT * FROM users WHERE remote_user_id = ?',
    [remoteId]
  );
}

/**
 * Get primary auth user (first activated user)
 */
export async function getPrimaryAuthUser(): Promise<AuthUser | null> {
  return await queryOne<AuthUser>(
    'SELECT * FROM users WHERE remote_user_id IS NOT NULL ORDER BY id LIMIT 1'
  );
}

/**
 * Get all auth users
 */
export async function getAllAuthUsers(): Promise<AuthUser[]> {
  return await query<AuthUser>(
    'SELECT * FROM users WHERE remote_user_id IS NOT NULL ORDER BY display_name'
  );
}

/**
 * Create or update auth user from server profile
 */
export async function saveAuthUser(profile: {
  remote_user_id: number;
  email: string;
  name: string;
  role?: string | null;
  permissions?: string;
}): Promise<AuthUser> {
  const timestamp = now();

  // Check if user with this remote_id exists
  const existing = await getAuthUserByRemoteId(profile.remote_user_id);

  if (existing) {
    // Update existing user
    await exec(
      `UPDATE users SET
        email = ?, display_name = ?, role = ?,
        permissions = ?, profile_synced_at = ?, updated_at = ?
      WHERE remote_user_id = ?`,
      [
        profile.email,
        profile.name,
        profile.role ?? existing.role,
        profile.permissions ?? null,
        timestamp,
        timestamp,
        profile.remote_user_id
      ]
    );
    return (await getAuthUserByRemoteId(profile.remote_user_id))!;
  }

  // Create new user
  const userId = generateId();
  await exec(
    `INSERT INTO users (
      id, username, display_name, role, is_active,
      created_at, updated_at, remote_user_id, email,
      permissions, profile_synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      profile.email, // use email as username
      profile.name,
      profile.role ?? 'ASSOCIATE',
      1,
      timestamp,
      timestamp,
      profile.remote_user_id,
      profile.email,
      profile.permissions ?? null,
      timestamp
    ]
  );

  return (await getAuthUserById(userId))!;
}

/**
 * Update user's PIN credentials
 */
export async function updateUserPin(
  userId: string,
  pinHash: string,
  pinSalt: string
): Promise<void> {
  await exec(
    `UPDATE users SET
      pin_hash = ?, pin_salt = ?, pin_attempts = 0,
      pin_locked_until = NULL, updated_at = ?
    WHERE id = ?`,
    [pinHash, pinSalt, now(), userId]
  );
}

/**
 * Increment PIN attempts
 */
export async function incrementPinAttempts(userId: string): Promise<number> {
  await exec(
    'UPDATE users SET pin_attempts = pin_attempts + 1, updated_at = ? WHERE id = ?',
    [now(), userId]
  );
  const user = await getAuthUserById(userId);
  return user?.pin_attempts ?? 0;
}

/**
 * Lock user PIN (after too many attempts)
 */
export async function lockUserPin(userId: string, lockedUntil: Date): Promise<void> {
  await exec(
    'UPDATE users SET pin_locked_until = ?, updated_at = ? WHERE id = ?',
    [lockedUntil.toISOString(), now(), userId]
  );
}

/**
 * Reset PIN attempts and unlock
 */
export async function resetPinAttempts(userId: string): Promise<void> {
  await exec(
    'UPDATE users SET pin_attempts = 0, pin_locked_until = NULL, updated_at = ? WHERE id = ?',
    [now(), userId]
  );
}

/**
 * Update biometric credential
 */
export async function updateBiometricCredential(
  userId: string,
  credentialId: string | null
): Promise<void> {
  await exec(
    `UPDATE users SET
      biometric_enabled = ?, biometric_credential_id = ?, updated_at = ?
    WHERE id = ?`,
    [credentialId ? 1 : 0, credentialId, now(), userId]
  );
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  await exec(
    'UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?',
    [now(), now(), userId]
  );
}

// ─────────────────────────────────────────────────────────────
// Auth Sessions
// ─────────────────────────────────────────────────────────────

/**
 * Create a new auth session
 */
export async function createAuthSession(
  userId: string,
  authMethod: 'pin' | 'biometric' | 'activation'
): Promise<number> {
  const timestamp = now();

  // End any active sessions for this user
  await exec(
    `UPDATE auth_sessions SET is_active = 0, ended_at = ?
    WHERE user_id = ? AND is_active = 1`,
    [timestamp, userId]
  );

  // Create new session
  await exec(
    `INSERT INTO auth_sessions (user_id, auth_method, started_at, is_active)
    VALUES (?, ?, ?, 1)`,
    [userId, authMethod, timestamp]
  );

  // Get the inserted session ID
  const result = await queryOne<{ id: number }>(
    'SELECT last_insert_rowid() as id'
  );

  return result?.id ?? 0;
}

/**
 * End an auth session
 */
export async function endAuthSession(sessionId: number): Promise<void> {
  await exec(
    'UPDATE auth_sessions SET is_active = 0, ended_at = ? WHERE id = ?',
    [now(), sessionId]
  );
}

/**
 * Clear all auth sessions
 */
export async function clearAuthSessions(): Promise<void> {
  await exec('DELETE FROM auth_sessions');
}

// ─────────────────────────────────────────────────────────────
// Full Cleanup
// ─────────────────────────────────────────────────────────────

/**
 * Clear all auth data (for device deactivation)
 */
export async function clearAllAuthData(): Promise<void> {
  await transaction(async () => {
    await clearAuthSessions();
    await clearDeviceCredentials();
    // Reset auth fields on users
    await exec(`
      UPDATE users SET
        remote_user_id = NULL,
        email = NULL,
        pin_hash = NULL,
        pin_salt = NULL,
        pin_attempts = 0,
        pin_locked_until = NULL,
        biometric_enabled = 0,
        biometric_credential_id = NULL,
        permissions = NULL,
        last_login_at = NULL,
        profile_synced_at = NULL
    `);
  });
}

/**
 * Clear all data for fresh start (on first activation)
 * This clears ALL local data including inventory
 */
export async function clearAllDataForFreshStart(): Promise<void> {
  await transaction(async () => {
    // Clear auth data
    await clearAuthSessions();
    await clearDeviceCredentials();

    // Clear inventory data using the SQL from schema
    const statements = CLEAR_INVENTORY_DATA_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await exec(statement);
    }
  });
}
