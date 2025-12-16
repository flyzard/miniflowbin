/**
 * Capacitor SQLite Database Module
 *
 * Provides persistent local storage using native SQLite via Capacitor.
 * All operations are async for native platform compatibility.
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const DB_NAME = 'flowbin';
const sqlite = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;

/**
 * Initialize the SQLite database
 * Must be called before any other database operations
 */
export async function initDatabase(): Promise<void> {
  if (db) return;

  console.log('[DB] Initializing Capacitor SQLite...');

  const platform = Capacitor.getPlatform();
  console.log('[DB] Running on platform:', platform);

  // Initialize the plugin for native platforms
  if (platform === 'ios' || platform === 'android') {
    try {
      // Request permissions if needed
      const result = await CapacitorSQLite.requestPermissions();
      console.log('[DB] Permissions result:', result);
    } catch (error) {
      console.error('[DB] Error requesting permissions:', error);
    }
  }

  // Check connection consistency
  const retCC = (await sqlite.checkConnectionsConsistency()).result;
  const isConn = (await sqlite.isConnection(DB_NAME, false)).result;

  if (retCC && isConn) {
    db = await sqlite.retrieveConnection(DB_NAME, false);
  } else {
    db = await sqlite.createConnection(
      DB_NAME,
      false,
      'no-encryption',
      1,
      false
    );
  }

  await db.open();

  // Configure database for better performance and reliability
  // PRAGMAs return values, so use query() instead of execute() on Android
  try {
    await db.query('PRAGMA journal_mode = WAL;', []);
    await db.query('PRAGMA synchronous = NORMAL;', []);
    await db.query('PRAGMA foreign_keys = ON;', []);
    await db.query('PRAGMA cache_size = -2000;', []);
    console.log('[DB] PRAGMAs configured successfully');
  } catch (error) {
    // PRAGMAs are optional optimizations, log but don't fail
    console.warn('[DB] PRAGMA configuration warning:', error);
  }

  console.log('[DB] Database initialized successfully');
}

/**
 * Get the database instance (must be initialized first)
 */
function getDatabase(): SQLiteDBConnection {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Execute a SQL statement with optional parameters
 * Uses execute() for DDL (no params) and run() for DML (with params)
 */
export async function exec(sql: string, params?: unknown[]): Promise<void> {
  const database = getDatabase();
  if (params && params.length > 0) {
    // DML with parameters - use run()
    await database.run(sql, params);
  } else {
    // DDL or multi-statement SQL - use execute()
    await database.execute(sql);
  }
}

/**
 * Execute a query and return all results
 */
export async function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
  const database = getDatabase();
  const result = await database.query(sql, params ?? []);
  return (result.values ?? []) as T[];
}

/**
 * Execute a query and return the first result
 */
export async function queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null> {
  const results = await query<T>(sql, params);
  return results[0] ?? null;
}

/**
 * Execute multiple statements in a transaction
 * Uses the plugin's native transaction methods for Android compatibility
 */
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  const database = getDatabase();

  // Check if transaction is already active
  const isActive = await database.isTransactionActive();
  if (isActive.result) {
    // Already in a transaction, just run the function
    return await fn();
  }

  // Use plugin's native transaction methods
  await database.beginTransaction();
  try {
    const result = await fn();
    await database.commitTransaction();
    return result;
  } catch (error) {
    await database.rollbackTransaction();
    throw error;
  }
}
