/**
 * Application Initialization
 *
 * Initializes the database and application state on startup
 */

import { initDatabase } from './db/database';
import { initializeSchema } from './db/migrations';
import { initDeviceAuth } from './auth';
import { initDistributionCenter } from './stores/distributionCenter';
import { initLocale } from './i18n';
import { authStore } from './auth/authStore';
import * as transactionRepo from './repositories/transactionRepo';
import * as settingsRepo from './repositories/settingsRepo';

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

    // Initialize device auth (handles device activation, PIN, biometric)
    await initDeviceAuth();
    console.log('[Init] Device auth initialized');

    await initDistributionCenter();
    console.log('[Init] Distribution center initialized');

    // Initialize transaction counts
    const dcId = await settingsRepo.getSelectedDcId();
    if (dcId) {
      const pendingCount = await transactionRepo.getPendingTransactionCount(dcId);
      const rejectedCount = await transactionRepo.getRejectedTransactionCount(dcId);
      authStore.setPendingTransactionCount(pendingCount);
      authStore.setRejectedTransactionCount(rejectedCount);
      console.log(`[Init] Transaction counts: ${pendingCount} pending, ${rejectedCount} rejected`);
    }

    await initLocale();
    console.log('[Init] Locale initialized');

    initialized = true;
    console.log('[Init] App initialization complete');
  } catch (error) {
    console.error('[Init] Initialization failed:', error);
    throw error;
  }
}
