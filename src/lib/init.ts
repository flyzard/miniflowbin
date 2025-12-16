/**
 * Application Initialization
 *
 * Initializes the database and application state on startup
 */

import { initDatabase } from './db/database';
import { initializeSchema } from './db/migrations';
import { initAuth } from './stores/auth';
import { initDistributionCenter } from './stores/distributionCenter';

let initialized = false;

/**
 * Initialize the application
 *
 * - Initializes SQLite database
 * - Runs migrations
 * - Initializes auth and DC stores from saved settings
 */
export async function initApp(): Promise<void> {
  if (initialized) {
    console.log('[Init] App already initialized');
    return;
  }

  console.log('[Init] Starting app initialization...');

  try {
    // Initialize SQLite database
    await initDatabase();
    console.log('[Init] Database initialized');

    // Run migrations (no seeding - database starts empty)
    await initializeSchema();
    console.log('[Init] Schema initialized');

    // Initialize stores from saved settings
    await initAuth();
    console.log('[Init] Auth initialized');

    await initDistributionCenter();
    console.log('[Init] Distribution center initialized');

    initialized = true;
    console.log('[Init] App initialization complete');
  } catch (error) {
    console.error('[Init] Initialization failed:', error);
    throw error;
  }
}

/**
 * Check if app is initialized
 */
export function isAppInitialized(): boolean {
  return initialized;
}
