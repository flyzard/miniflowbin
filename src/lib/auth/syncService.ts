/**
 * Sync Service
 *
 * Handles background synchronization of auth state with the server.
 * Includes debouncing to prevent excessive API calls.
 */

import * as deviceService from './deviceService';
import * as authRepo from './authRepository';
import * as crypto from './cryptoService';
import { AUTH_CONSTANTS } from './types';

// Sync state
let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let lastSyncTime = 0;

// Callbacks for state updates (set by authStore)
let onStatusChange: ((status: string) => void) | null = null;
let onSyncComplete: ((date: Date) => void) | null = null;
let onSyncError: ((error: string | null) => void) | null = null;

// ─────────────────────────────────────────────────────────────
// Callback Registration
// ─────────────────────────────────────────────────────────────

/**
 * Set callbacks for sync events (called by authStore during initialization)
 */
export function setSyncCallbacks(callbacks: {
  onStatusChange?: (status: string) => void;
  onSyncComplete?: (date: Date) => void;
  onSyncError?: (error: string | null) => void;
}): void {
  onStatusChange = callbacks.onStatusChange ?? null;
  onSyncComplete = callbacks.onSyncComplete ?? null;
  onSyncError = callbacks.onSyncError ?? null;
}

// ─────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────

/**
 * Start background sync scheduler
 */
export function startBackgroundSync(): void {
  if (syncIntervalId) {
    console.log('[Sync] Already running');
    return;
  }

  console.log('[Sync] Starting background sync');

  // Initial sync after short delay
  setTimeout(() => debouncedSync(), 5000);

  // Schedule periodic sync
  syncIntervalId = setInterval(debouncedSync, AUTH_CONSTANTS.SYNC_INTERVAL_MS);

  // Sync when coming back online
  window.addEventListener('online', handleOnline);

  // Sync when app becomes visible
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Stop background sync
 */
export function stopBackgroundSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }

  window.removeEventListener('online', handleOnline);
  document.removeEventListener('visibilitychange', handleVisibilityChange);

  console.log('[Sync] Background sync stopped');
}

/**
 * Check if background sync is running
 */
export function isSyncRunning(): boolean {
  return syncIntervalId !== null;
}

// ─────────────────────────────────────────────────────────────
// Event Handlers
// ─────────────────────────────────────────────────────────────

function handleOnline(): void {
  console.log('[Sync] Back online, scheduling sync...');
  debouncedSync();
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    console.log('[Sync] App visible, scheduling sync...');
    debouncedSync();
  }
}

// ─────────────────────────────────────────────────────────────
// Debounced Sync
// ─────────────────────────────────────────────────────────────

/**
 * Trigger sync with debouncing
 * Prevents multiple syncs within SYNC_DEBOUNCE_MS
 */
function debouncedSync(): void {
  const now = Date.now();
  const timeSinceLastSync = now - lastSyncTime;

  if (timeSinceLastSync < AUTH_CONSTANTS.SYNC_DEBOUNCE_MS) {
    console.log(`[Sync] Debounced (${Math.round(timeSinceLastSync / 1000)}s since last sync)`);
    return;
  }

  performSync();
}

// ─────────────────────────────────────────────────────────────
// Sync Logic
// ─────────────────────────────────────────────────────────────

/**
 * Perform sync if conditions are met
 */
async function performSync(): Promise<void> {
  // Prevent concurrent syncs
  if (isRunning) {
    console.log('[Sync] Sync already in progress');
    return;
  }

  // Don't sync if encryption key not available (not logged in)
  if (!crypto.hasEncryptionKey()) {
    console.log('[Sync] Not logged in, skipping sync');
    return;
  }

  // Don't sync if offline
  if (!navigator.onLine) {
    console.log('[Sync] Offline, skipping sync');
    return;
  }

  isRunning = true;
  lastSyncTime = Date.now();

  try {
    // Get credentials to check expiry
    const credentials = await authRepo.getDeviceCredentials();
    if (!credentials) {
      isRunning = false;
      return;
    }

    const tokenExpiry = new Date(credentials.token_expires_at);
    const refreshExpiry = new Date(credentials.refresh_expires_at);
    const now = new Date();

    // Check if refresh token is expired
    if (refreshExpiry < now) {
      console.log('[Sync] Refresh token expired');
      onStatusChange?.('activation_required');
      isRunning = false;
      return;
    }

    // Refresh if token is near expiry
    if (deviceService.isTokenNearExpiry(tokenExpiry, AUTH_CONSTANTS.TOKEN_REFRESH_THRESHOLD_DAYS)) {
      console.log('[Sync] Token near expiry, refreshing...');
      const refreshed = await deviceService.refreshTokens();
      if (!refreshed) {
        console.warn('[Sync] Token refresh failed');
        onSyncError?.('Failed to refresh tokens');
      }
    }

    // Validate and sync profile
    console.log('[Sync] Validating device...');
    const result = await deviceService.validateAndSync();

    if (!result.valid) {
      if (result.status === 'revoked') {
        onStatusChange?.('revoked');
      } else if (result.status === 'suspended') {
        onStatusChange?.('suspended');
      }
      isRunning = false;
      return;
    }

    onSyncComplete?.(new Date());
    onSyncError?.(null);
    console.log('[Sync] Sync complete');

  } catch (error) {
    console.error('[Sync] Sync failed:', error);
    onSyncError?.('Sync failed');
  } finally {
    isRunning = false;
  }
}

/**
 * Manual sync trigger (for user-initiated sync)
 */
export async function manualSync(): Promise<boolean> {
  if (!navigator.onLine) {
    onSyncError?.('Cannot sync while offline');
    return false;
  }

  if (!crypto.hasEncryptionKey()) {
    onSyncError?.('Please log in first');
    return false;
  }

  // Force sync even if debounced
  lastSyncTime = 0;
  await performSync();

  // Return true if no error
  return true;
}

/**
 * Get time since last sync
 */
export function getTimeSinceLastSync(): number {
  return Date.now() - lastSyncTime;
}
