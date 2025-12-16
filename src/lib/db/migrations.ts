/**
 * Database Migrations System
 *
 * Handles schema versioning and initial data setup
 */

import { exec, query, queryOne, transaction } from './database';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';
import { generateId, now } from '../types';

interface TableColumn {
  name: string;
}

/**
 * Check if a column exists in a table
 */
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const columns = await query<TableColumn>(`PRAGMA table_info(${tableName})`);
  return columns.some(col => col.name === columnName);
}

/**
 * Add a column to a table if it doesn't exist
 */
async function addColumnIfNotExists(
  tableName: string,
  columnName: string,
  columnDef: string
): Promise<void> {
  const exists = await columnExists(tableName, columnName);
  if (!exists) {
    await exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
    console.log(`[Migrations] Added column ${columnName} to ${tableName}`);
  } else {
    console.log(`[Migrations] Column ${columnName} already exists in ${tableName}`);
  }
}

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
 *
 * NOTE: DDL operations (CREATE TABLE, ALTER TABLE, CREATE INDEX) are auto-committed
 * in SQLite and cannot be rolled back. We don't wrap them in transactions because:
 * 1. It provides no benefit (DDL can't be rolled back)
 * 2. Android's Capacitor SQLite has issues with DDL inside explicit transactions
 */
export async function runMigrations(): Promise<void> {
  const currentVersion = await getCurrentVersion();
  console.log(`[Migrations] Current schema version: ${currentVersion}`);

  if (currentVersion < SCHEMA_VERSION) {
    console.log(`[Migrations] Upgrading to version ${SCHEMA_VERSION}...`);

    // For fresh installs (version 0), run the full schema creation
    if (currentVersion === 0) {
      // Split CREATE_TABLES_SQL into individual statements for Android compatibility
      const statements = CREATE_TABLES_SQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        await exec(statement);
      }
      await recordVersion(SCHEMA_VERSION);
    } else {
      // Run incremental migrations
      let version = currentVersion;

      // Migration v1 -> v2: Add color and size columns to products
      if (version === 1) {
        console.log('[Migrations] Running migration v1 -> v2: Add color/size to products');
        await addColumnIfNotExists('products', 'color', 'TEXT');
        await addColumnIfNotExists('products', 'size', 'TEXT');
        version = 2;
        await recordVersion(2);
      }

      // Migration v2 -> v3: Add auth tables and columns
      if (version === 2) {
        console.log('[Migrations] Running migration v2 -> v3: Add auth tables');

        // Add auth columns to users table (safely, checking if exists)
        await addColumnIfNotExists('users', 'remote_user_id', 'INTEGER');
        await addColumnIfNotExists('users', 'email', 'TEXT');
        await addColumnIfNotExists('users', 'pin_hash', 'TEXT');
        await addColumnIfNotExists('users', 'pin_salt', 'TEXT');
        await addColumnIfNotExists('users', 'pin_attempts', 'INTEGER NOT NULL DEFAULT 0');
        await addColumnIfNotExists('users', 'pin_locked_until', 'TEXT');
        await addColumnIfNotExists('users', 'biometric_enabled', 'INTEGER NOT NULL DEFAULT 0');
        await addColumnIfNotExists('users', 'biometric_credential_id', 'TEXT');
        await addColumnIfNotExists('users', 'permissions', 'TEXT');
        await addColumnIfNotExists('users', 'last_login_at', 'TEXT');
        await addColumnIfNotExists('users', 'profile_synced_at', 'TEXT');

        // Create indexes for new columns (IF NOT EXISTS)
        await exec('CREATE INDEX IF NOT EXISTS idx_users_remote_id ON users(remote_user_id)');
        await exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');

        // Create device_credentials table
        await exec(`
          CREATE TABLE IF NOT EXISTS device_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT UNIQUE NOT NULL,
            device_token_encrypted TEXT NOT NULL,
            refresh_token_encrypted TEXT NOT NULL,
            token_expires_at TEXT NOT NULL,
            refresh_expires_at TEXT NOT NULL,
            activated_at TEXT NOT NULL,
            last_sync_at TEXT
          )
        `);
        await exec('CREATE INDEX IF NOT EXISTS idx_device_credentials_device_id ON device_credentials(device_id)');

        // Create auth_sessions table
        await exec(`
          CREATE TABLE IF NOT EXISTS auth_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            auth_method TEXT NOT NULL,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        await exec('CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id)');
        await exec('CREATE INDEX IF NOT EXISTS idx_auth_sessions_active ON auth_sessions(is_active)');

        version = 3;
        await recordVersion(3);
      }
    }

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
