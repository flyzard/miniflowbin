/**
 * Database Migrations System
 *
 * Handles schema versioning and initial data setup
 */

import { exec, query, queryOne, transaction } from './database';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';
import { generateId, now } from '../types';

interface SchemaVersion {
  version: number;
  applied_at: string;
}

/**
 * Get the current schema version from the database
 */
async function getCurrentVersion(): Promise<number> {
  try {
    const result = await queryOne<SchemaVersion>(
      'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
    );
    return result?.version ?? 0;
  } catch {
    // Table doesn't exist yet
    return 0;
  }
}

/**
 * Record a migration version
 */
async function recordVersion(version: number): Promise<void> {
  await exec(
    'INSERT INTO schema_version (version, applied_at) VALUES (?, ?)',
    [version, new Date().toISOString()]
  );
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  const currentVersion = await getCurrentVersion();
  console.log(`[Migrations] Current schema version: ${currentVersion}`);

  if (currentVersion < SCHEMA_VERSION) {
    console.log(`[Migrations] Upgrading to version ${SCHEMA_VERSION}...`);

    await transaction(async () => {
      // For fresh installs (version 0), run the full schema creation
      if (currentVersion === 0) {
        await exec(CREATE_TABLES_SQL);
        await recordVersion(SCHEMA_VERSION);
      } else {
        // Run incremental migrations
        let version = currentVersion;

        // Migration v1 -> v2: Add color and size columns to products
        if (version === 1) {
          console.log('[Migrations] Running migration v1 -> v2: Add color/size to products');
          await exec('ALTER TABLE products ADD COLUMN color TEXT');
          await exec('ALTER TABLE products ADD COLUMN size TEXT');
          version = 2;
          await recordVersion(2);
        }

        // Future migrations would go here:
        // if (version === 2) { ... version = 3; await recordVersion(3); }
      }
    });

    console.log('[Migrations] Schema upgrade complete');
  } else {
    console.log('[Migrations] Schema is up to date');
  }
}

/**
 * Ensure default distribution center and user exist
 */
async function ensureDefaultData(): Promise<void> {
  // Check if any distribution center exists
  const dcCount = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM distribution_centers'
  );

  if (!dcCount || dcCount.count === 0) {
    console.log('[Migrations] Creating default distribution center...');
    const timestamp = now();
    const dcId = generateId();

    await exec(
      `INSERT INTO distribution_centers (id, code, name, address, timezone, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [dcId, 'DC1', 'Distribution Center', null, 'UTC', 1, timestamp, timestamp]
    );

    // Store selected DC in settings
    await exec(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      ['selected_dc_id', dcId]
    );

    console.log('[Migrations] Default distribution center created');
  }

  // Check if any user exists
  const userCount = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM users'
  );

  if (!userCount || userCount.count === 0) {
    console.log('[Migrations] Creating default user...');
    const timestamp = now();
    const userId = generateId();

    await exec(
      `INSERT INTO users (id, username, display_name, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, 'admin', 'Administrator', 'MANAGER', 1, timestamp, timestamp]
    );

    await exec(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      ['current_user_id', userId]
    );

    console.log('[Migrations] Default user created');
  }
}

/**
 * Initialize database schema
 */
export async function initializeSchema(): Promise<void> {
  await runMigrations();
  await ensureDefaultData();
}
