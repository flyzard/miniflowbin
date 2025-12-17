/**
 * Auth Module Entry Point
 *
 * Exports all auth functionality and handles initialization.
 */

import { get } from 'svelte/store';
import { authStore } from './authStore';
import * as authRepo from './authRepository';
import * as deviceService from './deviceService';
import * as crypto from './cryptoService';
import { startBackgroundSync, stopBackgroundSync, setSyncCallbacks } from './syncService';
import { fetchAndSyncData, uploadPendingTransactions } from '../services/dataSyncService';
import { refreshDistributionCenter } from '../stores/distributionCenter';
import * as transactionRepo from '../repositories/transactionRepo';
import * as settingsRepo from '../repositories/settingsRepo';

// Re-export everything
export * from './types';
export * from './authStore';
export * from './deviceService';
export * from './pinService';
export * from './biometricService';
export * from './syncService';

// Export repository functions that may be needed by components
export {
  getAuthUserById,
  getPrimaryAuthUser,
  getDeviceCredentials,
} from './authRepository';

// Export crypto utilities for PIN setup
export {
  generateSalt,
  uint8ArrayToHex,
  hexToUint8Array,
} from './cryptoService';

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

/**
 * Initialize the auth system
 * Called from initApp() in src/lib/init.ts
 */
export async function initDeviceAuth(): Promise<void> {
  console.log('[Auth] Initializing device auth...');

  authStore.setStatus('initializing');

  // Set up sync callbacks
  setSyncCallbacks({
    onStatusChange: (status) => authStore.setStatus(status as any),
    onSyncComplete: (date) => authStore.setLastSync(date),
    onSyncError: (error) => authStore.setSyncError(error),
  });

  // Set up online/offline listeners
  window.addEventListener('online', () => authStore.setOnline(true));
  window.addEventListener('offline', () => authStore.setOnline(false));

  try {
    // Check for stored device credentials
    const credentials = await authRepo.getDeviceCredentials();

    if (!credentials) {
      console.log('[Auth] No credentials found - device not activated');
      authStore.setStatus('not_activated');
      return;
    }

    // Check token expiry
    const tokenExpiry = new Date(credentials.token_expires_at);
    const refreshExpiry = new Date(credentials.refresh_expires_at);
    const now = new Date();

    // Store device info
    authStore.setDeviceInfo(credentials.device_id, tokenExpiry);

    // If refresh token is expired, need reactivation
    if (refreshExpiry < now) {
      console.log('[Auth] Refresh token expired - reactivation required');
      authStore.setStatus('activation_required');
      return;
    }

    // Load primary user
    const user = await authRepo.getPrimaryAuthUser();
    if (!user) {
      console.log('[Auth] No auth user found - reactivation required');
      authStore.setStatus('activation_required');
      return;
    }

    // Store user info (but not authenticated yet - needs PIN)
    authStore.setUserWithoutAuth(user);

    // Check if user has PIN set up
    if (!user.pin_hash || !user.pin_salt) {
      // Needs PIN setup (first time after activation)
      console.log('[Auth] PIN not set up');
      // Check if there's a pending activation
      if (deviceService.hasPendingActivation()) {
        authStore.setStatus('login_required'); // Will redirect to setup PIN
      } else {
        // This shouldn't happen - activated but no PIN
        console.warn('[Auth] Activated but no PIN - may need reactivation');
        authStore.setStatus('activation_required');
      }
    } else {
      // Ready for PIN login
      console.log('[Auth] Ready for login');
      authStore.setStatus('login_required');
    }

  } catch (error) {
    console.error('[Auth] Initialization failed:', error);
    authStore.setStatus('not_activated');
  }
}

/**
 * Complete authentication after successful PIN verification
 * Called by login page after verifyPin() succeeds
 */
export async function completeLogin(userId: string, sessionId: number): Promise<void> {
  const user = await authRepo.getAuthUserById(userId);
  if (user) {
    authStore.setUser(user);
    authStore.setSessionId(sessionId);

    // Initialize pending transaction count
    await initializePendingCount();

    // Start background sync for auth validation
    startBackgroundSync();

    // Sync warehouse data if online
    if (navigator.onLine) {
      await performDataSync();
    }
  }
}

/**
 * Initialize pending transaction count on login
 */
async function initializePendingCount(): Promise<void> {
  const dcId = await settingsRepo.getSelectedDcId();
  if (dcId) {
    const count = await transactionRepo.getPendingTransactionCount(dcId);
    authStore.setPendingTransactionCount(count);
    console.log(`[Auth] Initialized pending transaction count: ${count}`);
  }
}

/**
 * Perform data sync and update store status
 * Step 1: Upload pending transactions
 * Step 2: Download fresh data (products, positions, inventory)
 */
async function performDataSync(): Promise<void> {
  authStore.setDataSyncing(true);

  // Get current DC ID
  const dcId = await settingsRepo.getSelectedDcId();

  // Step 1: Upload pending transactions first
  if (dcId) {
    authStore.setUploadSyncing(true);
    const uploadResult = await uploadPendingTransactions(dcId);
    authStore.setUploadSyncing(false);

    if (uploadResult.success) {
      authStore.setLastUploadSync(new Date());
      // Refresh pending count after upload
      const pendingCount = await transactionRepo.getPendingTransactionCount(dcId);
      authStore.setPendingTransactionCount(pendingCount);
      console.log('[Auth] Upload sync complete:', uploadResult.syncedCount, 'synced,', uploadResult.rejectedCount, 'rejected');
    } else {
      authStore.setUploadSyncError(uploadResult.error);
      console.warn('[Auth] Upload sync failed:', uploadResult.error);
      // Continue with download even if upload fails
    }
  }

  // Step 2: Download fresh data
  const result = await fetchAndSyncData();

  authStore.setDataSyncing(false);

  if (result.success) {
    // Refresh the distribution center store with the newly synced DC
    await refreshDistributionCenter();
    authStore.setLastDataSync(new Date());
    authStore.setDataSyncError(null);
    console.log('[Auth] Data sync complete:', result.productCount, 'products,', result.positionCount, 'positions');
  } else {
    authStore.setDataSyncError(result.error);
    console.warn('[Auth] Data sync failed:', result.error);
  }
}

/**
 * Sync data on app startup if authenticated and online
 * Called after initDeviceAuth when user is already authenticated
 */
export async function syncOnStartup(): Promise<void> {
  const state = get(authStore);

  if (state.status !== 'authenticated') {
    return;
  }

  if (!navigator.onLine) {
    console.log('[Auth] Offline, skipping startup sync');
    return;
  }

  console.log('[Auth] Syncing data on startup...');
  await performDataSync();
}

/**
 * Deactivate device (full logout and credential removal)
 */
export async function deactivateDevice(): Promise<void> {
  console.log('[Auth] Deactivating device...');

  // Stop background sync
  stopBackgroundSync();

  // Clear all auth data from database
  await authRepo.clearAllAuthData();

  // Clear encryption key and device ID
  crypto.clearEncryptionKey();
  deviceService.clearDeviceId();

  // Reset store
  authStore.reset();

  console.log('[Auth] Device deactivated');
}

/**
 * Logout current session (keeps device activated)
 */
export async function logout(): Promise<void> {
  // Stop background sync (will restart on next login)
  stopBackgroundSync();

  // Let the store handle the logout
  await authStore.logout();
}
