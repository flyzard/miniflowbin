/**
 * Capacitor SQLite Database Module
 *
 * Provides persistent local storage using native SQLite via Capacitor.
 * All operations are async for native platform compatibility.
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';

const DB_NAME = 'flowbin';
const sqlite = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;

// Track if we're inside an explicit transaction (for Android compatibility)
let inTransaction = false;

/**
 * Initialize SQLite for web platform using jeep-sqlite
 */
async function initWebSQLite(): Promise<void> {
  console.log('[DB] Initializing web SQLite with jeep-sqlite...');

  // Define custom elements FIRST (before any element exists in DOM)
  await jeepSqlite(window);

  // Wait for the custom element to be defined
  await customElements.whenDefined('jeep-sqlite');

  // Create the element dynamically AFTER custom element is defined
  let jeepEl = document.querySelector('jeep-sqlite');
  if (!jeepEl) {
    jeepEl = document.createElement('jeep-sqlite');
    document.body.appendChild(jeepEl);
  }

  // Configure WASM file location
  jeepEl.setAttribute('wasmPath', '/assets');

  // Wait for the component to be ready (hydrated)
  await new Promise<void>((resolve) => {
    if ((jeepEl as any).componentOnReady) {
      (jeepEl as any).componentOnReady().then(() => resolve());
    } else {
      // Fallback: wait a tick for the component to initialize
      requestAnimationFrame(() => resolve());
    }
  });

  // Initialize IndexedDB store
  await sqlite.initWebStore();

  console.log('[DB] Web SQLite initialized successfully');
}

/**
 * Initialize the SQLite database
 * Must be called before any other database operations
 */
export async function initDatabase(): Promise<void> {
  if (db) return;

  console.log('[DB] Initializing Capacitor SQLite...');

  const platform = Capacitor.getPlatform();
  console.log('[DB] Running on platform:', platform);

  // Platform-specific initialization
  if (platform === 'web') {
    // Web requires jeep-sqlite initialization
    await initWebSQLite();
  } else if (platform === 'ios' || platform === 'android') {
    // Request permissions for native platforms
    try {
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
 * Save database to IndexedDB (web only)
 * Called automatically after transactions on web platform
 */
export async function saveToStore(): Promise<void> {
  if (Capacitor.getPlatform() === 'web' && db) {
    await sqlite.saveToStore(DB_NAME);
  }
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
 * Uses run() for single-statement DML and execute() for DDL/multi-statement SQL
 *
 * On Android, run() has an implicit transaction parameter that defaults to true.
 * When we're inside an explicit transaction, we pass false to avoid conflicts.
 */
export async function exec(sql: string, params?: unknown[]): Promise<void> {
  const database = getDatabase();
  const trimmedSql = sql.trim().toUpperCase();

  // Determine if this is a DML statement (INSERT, UPDATE, DELETE, REPLACE)
  // These should use run() to avoid implicit transaction conflicts on Android
  const isDML = /^(INSERT|UPDATE|DELETE|REPLACE)\b/.test(trimmedSql);

  if (isDML) {
    // DML statements - use run()
    // Pass transaction=false when we're already in an explicit transaction (Android)
    const useImplicitTransaction = !inTransaction;
    await database.run(sql, params ?? [], useImplicitTransaction);
  } else {
    // DDL (CREATE, ALTER, DROP, etc.) or multi-statement SQL - use execute()
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
 * On web, transactions are handled differently due to sql.js limitations
 */
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  const database = getDatabase();
  const platform = Capacitor.getPlatform();

  // On web, sql.js handles transactions differently - just run the function
  // and save to store afterward. The execute() method handles atomicity for DDL.
  if (platform === 'web') {
    try {
      const result = await fn();
      await saveToStore();
      return result;
    } catch (error) {
      // Still try to save to preserve any partial state
      try {
        await saveToStore();
      } catch {
        // Ignore save errors during error handling
      }
      throw error;
    }
  }

  // Native platforms: use explicit transaction methods
  // Check if transaction is already active (either via our flag or plugin check)
  const isActive = await database.isTransactionActive();
  if (isActive.result || inTransaction) {
    // Already in a transaction, just run the function
    return await fn();
  }

  // Use plugin's native transaction methods
  // Set flag BEFORE beginTransaction so nested exec() calls know we're in a transaction
  inTransaction = true;
  await database.beginTransaction();
  try {
    const result = await fn();
    await database.commitTransaction();
    return result;
  } catch (error) {
    // Try to rollback, but don't fail if rollback fails
    try {
      await database.rollbackTransaction();
    } catch (rollbackError) {
      console.warn('[DB] Rollback failed:', rollbackError);
    }
    throw error;
  } finally {
    // Always reset flag
    inTransaction = false;
  }
}
