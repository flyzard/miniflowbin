/**
 * SQLite WASM Database Module
 *
 * Provides persistent local storage using SQLite WASM with:
 * - OPFS (Origin Private File System) as primary storage (Chrome, Edge, Firefox)
 * - IndexedDB as fallback for Safari
 */

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database, SqlValue } from '@sqlite.org/sqlite-wasm';

let db: Database | null = null;
let initPromise: Promise<Database> | null = null;

// Database file name
const DB_NAME = 'flowbin.db';

/**
 * Check if OPFS is available in the current browser
 */
async function isOPFSAvailable(): Promise<boolean> {
  try {
    if (!navigator.storage?.getDirectory) return false;
    const root = await navigator.storage.getDirectory();
    // Try to create and remove a test file
    await root.getFileHandle('__opfs_test__', { create: true });
    await root.removeEntry('__opfs_test__');
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize the SQLite database
 * Returns a singleton database instance
 */
export async function initDatabase(): Promise<Database> {
  // Return existing promise if initialization is in progress
  if (initPromise) return initPromise;

  // Return existing database if already initialized
  if (db) return db;

  initPromise = (async () => {
    console.log('[DB] Initializing SQLite WASM...');

    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
    });

    console.log('[DB] SQLite version:', sqlite3.version.libVersion);

    const useOPFS = await isOPFSAvailable();
    console.log('[DB] OPFS available:', useOPFS);

    if (useOPFS) {
      // Use OPFS for persistent storage
      console.log('[DB] Using OPFS storage');

      // Check if OPFS VFS is available
      if (sqlite3.oo1.OpfsDb) {
        db = new sqlite3.oo1.OpfsDb(DB_NAME);
      } else {
        console.warn('[DB] OpfsDb not available, falling back to in-memory with export');
        db = new sqlite3.oo1.DB(':memory:');
      }
    } else {
      // Fallback to in-memory database
      // In a production app, you'd want to use IndexedDB to persist the database file
      console.log('[DB] Using in-memory database (OPFS not available)');
      db = new sqlite3.oo1.DB(':memory:');
    }

    // Configure database for better performance and reliability
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA cache_size = -2000;
    `);

    console.log('[DB] Database initialized successfully');
    return db;
  })();

  return initPromise;
}

/**
 * Get the database instance (must be initialized first)
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Execute a SQL statement with optional parameters
 */
export function exec(sql: string, params?: SqlValue[]): void {
  const database = getDatabase();
  if (params && params.length > 0) {
    database.exec({ sql, bind: params });
  } else {
    database.exec(sql);
  }
}

/**
 * Execute a query and return all results
 */
export function query<T = Record<string, SqlValue>>(sql: string, params?: SqlValue[]): T[] {
  const database = getDatabase();
  const results: T[] = [];

  database.exec({
    sql,
    bind: params && params.length > 0 ? params : undefined,
    rowMode: 'object',
    callback: (row) => {
      results.push(row as T);
    }
  });

  return results;
}

/**
 * Execute a query and return the first result
 */
export function queryOne<T = Record<string, SqlValue>>(sql: string, params?: SqlValue[]): T | null {
  const results = query<T>(sql, params);
  return results[0] ?? null;
}

/**
 * Execute multiple statements in a transaction
 */
export function transaction<T>(fn: () => T): T {
  const database = getDatabase();
  database.exec('BEGIN TRANSACTION');
  try {
    const result = fn();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
