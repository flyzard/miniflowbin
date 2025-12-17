/**
 * Auth Store
 *
 * Centralized auth state management using Svelte stores.
 * Includes inactivity timer for automatic logout.
 */

import { writable, derived, get } from 'svelte/store';
import type { AuthStatus, AuthStoreState, AuthUser } from './types';
import { AUTH_CONSTANTS } from './types';
import * as crypto from './cryptoService';
import * as authRepo from './authRepository';

// ─────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────

const initialState: AuthStoreState = {
  status: 'initializing',
  currentUser: null,
  deviceId: null,
  tokenExpiresAt: null,
  lastSyncAt: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncError: null,
  sessionId: null,
  lastActivityAt: null,
  // Data sync status
  isDataSyncing: false,
  dataSyncError: null,
  lastDataSyncAt: null,
  // Transaction sync status (upload)
  pendingTransactionCount: 0,
  isUploadingSyncing: false,
  uploadSyncError: null,
  lastUploadSyncAt: null,
};

// ─────────────────────────────────────────────────────────────
// Inactivity Timer
// ─────────────────────────────────────────────────────────────

let inactivityTimerId: ReturnType<typeof setTimeout> | null = null;
let activityListenersAdded = false;

function startInactivityTimer(store: ReturnType<typeof createAuthStore>): void {
  // Clear existing timer
  if (inactivityTimerId) {
    clearTimeout(inactivityTimerId);
  }

  // Set new timer
  inactivityTimerId = setTimeout(() => {
    console.log('[Auth] Inactivity timeout - logging out');
    store.logout();
  }, AUTH_CONSTANTS.INACTIVITY_TIMEOUT_MS);
}

function stopInactivityTimer(): void {
  if (inactivityTimerId) {
    clearTimeout(inactivityTimerId);
    inactivityTimerId = null;
  }
}

function resetInactivityTimer(store: ReturnType<typeof createAuthStore>): void {
  const state = get(store);
  if (state.status === 'authenticated') {
    store.updateActivity();
    startInactivityTimer(store);
  }
}

function addActivityListeners(store: ReturnType<typeof createAuthStore>): void {
  if (activityListenersAdded) return;

  const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

  const handler = () => resetInactivityTimer(store);

  events.forEach(event => {
    document.addEventListener(event, handler, { passive: true });
  });

  activityListenersAdded = true;
}

function removeActivityListeners(): void {
  // Note: We don't actually remove listeners since they're added with passive: true
  // and the handler checks the auth state before doing anything
  activityListenersAdded = false;
}

// ─────────────────────────────────────────────────────────────
// Store Creation
// ─────────────────────────────────────────────────────────────

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthStoreState>(initialState);

  const store = {
    subscribe,

    // ─────────────────────────────────────────────────────────
    // Status Management
    // ─────────────────────────────────────────────────────────

    setStatus: (status: AuthStatus) => {
      update(state => ({ ...state, status }));

      // Start/stop inactivity timer based on status
      if (status === 'authenticated') {
        addActivityListeners(store);
        startInactivityTimer(store);
      } else {
        stopInactivityTimer();
      }
    },

    // ─────────────────────────────────────────────────────────
    // User Management
    // ─────────────────────────────────────────────────────────

    setUser: (user: AuthUser | null) => {
      update(state => ({
        ...state,
        currentUser: user,
        status: user ? 'authenticated' : state.status
      }));

      if (user) {
        addActivityListeners(store);
        startInactivityTimer(store);
      }
    },

    /**
     * Set user without changing auth status (for displaying user info before login)
     */
    setUserWithoutAuth: (user: AuthUser | null) => {
      update(state => ({
        ...state,
        currentUser: user
      }));
    },

    // ─────────────────────────────────────────────────────────
    // Device Info
    // ─────────────────────────────────────────────────────────

    setDeviceInfo: (deviceId: string, tokenExpiresAt: Date) => {
      update(state => ({
        ...state,
        deviceId,
        tokenExpiresAt
      }));
    },

    // ─────────────────────────────────────────────────────────
    // Online Status
    // ─────────────────────────────────────────────────────────

    setOnline: (isOnline: boolean) => {
      update(state => ({ ...state, isOnline }));
    },

    // ─────────────────────────────────────────────────────────
    // Sync Status
    // ─────────────────────────────────────────────────────────

    setLastSync: (date: Date) => {
      update(state => ({
        ...state,
        lastSyncAt: date,
        syncError: null
      }));
    },

    setSyncError: (error: string | null) => {
      update(state => ({ ...state, syncError: error }));
    },

    // ─────────────────────────────────────────────────────────
    // Data Sync Status
    // ─────────────────────────────────────────────────────────

    setDataSyncing: (isDataSyncing: boolean) => {
      update(state => ({ ...state, isDataSyncing }));
    },

    setDataSyncError: (error: string | null) => {
      update(state => ({ ...state, dataSyncError: error }));
    },

    setLastDataSync: (date: Date) => {
      update(state => ({
        ...state,
        lastDataSyncAt: date,
        dataSyncError: null
      }));
    },

    // ─────────────────────────────────────────────────────────
    // Transaction Upload Sync Status
    // ─────────────────────────────────────────────────────────

    setPendingTransactionCount: (count: number) => {
      update(state => ({ ...state, pendingTransactionCount: count }));
    },

    incrementPendingTransactionCount: () => {
      update(state => ({
        ...state,
        pendingTransactionCount: state.pendingTransactionCount + 1
      }));
    },

    decrementPendingTransactionCount: (by: number = 1) => {
      update(state => ({
        ...state,
        pendingTransactionCount: Math.max(0, state.pendingTransactionCount - by)
      }));
    },

    setUploadSyncing: (isUploadingSyncing: boolean) => {
      update(state => ({ ...state, isUploadingSyncing }));
    },

    setUploadSyncError: (error: string | null) => {
      update(state => ({ ...state, uploadSyncError: error }));
    },

    setLastUploadSync: (date: Date) => {
      update(state => ({
        ...state,
        lastUploadSyncAt: date,
        uploadSyncError: null
      }));
    },

    // ─────────────────────────────────────────────────────────
    // Session Management
    // ─────────────────────────────────────────────────────────

    setSessionId: (sessionId: number | null) => {
      update(state => ({ ...state, sessionId }));
    },

    // ─────────────────────────────────────────────────────────
    // Activity Tracking
    // ─────────────────────────────────────────────────────────

    updateActivity: () => {
      update(state => ({
        ...state,
        lastActivityAt: new Date()
      }));
    },

    // ─────────────────────────────────────────────────────────
    // Logout
    // ─────────────────────────────────────────────────────────

    /**
     * Logout current session (keeps device activated)
     */
    logout: async () => {
      const state = get(store);

      // End current session
      if (state.sessionId) {
        await authRepo.endAuthSession(state.sessionId);
      }

      // Clear encryption key from memory
      crypto.clearEncryptionKey();

      // Stop inactivity timer
      stopInactivityTimer();

      // Update state
      update(state => ({
        ...state,
        status: 'login_required',
        sessionId: null,
        lastActivityAt: null
        // Keep currentUser for login screen display
      }));
    },

    /**
     * Full reset (for device deactivation)
     */
    reset: () => {
      // Clear encryption key
      crypto.clearEncryptionKey();

      // Stop timers
      stopInactivityTimer();
      removeActivityListeners();

      // Reset state
      set({
        ...initialState,
        status: 'not_activated',
        isOnline: navigator.onLine
      });
    },
  };

  return store;
}

// ─────────────────────────────────────────────────────────────
// Export Store
// ─────────────────────────────────────────────────────────────

export const authStore = createAuthStore();

// ─────────────────────────────────────────────────────────────
// Derived Stores
// ─────────────────────────────────────────────────────────────

/**
 * Is user fully authenticated
 */
export const isAuthenticated = derived(
  authStore,
  $auth => $auth.status === 'authenticated'
);

/**
 * Current user (or null)
 */
export const currentUser = derived(
  authStore,
  $auth => $auth.currentUser
);

/**
 * Needs device activation
 */
export const requiresActivation = derived(
  authStore,
  $auth => ['not_activated', 'activation_required'].includes($auth.status)
);

/**
 * Device is blocked (suspended or revoked)
 */
export const isDeviceBlocked = derived(
  authStore,
  $auth => ['suspended', 'revoked'].includes($auth.status)
);

/**
 * Auth status for routing
 */
export const authStatus = derived(
  authStore,
  $auth => $auth.status
);

/**
 * Is online
 */
export const isOnline = derived(
  authStore,
  $auth => $auth.isOnline
);

/**
 * Needs login (device activated but user not authenticated)
 */
export const needsLogin = derived(
  authStore,
  $auth => $auth.status === 'login_required'
);

/**
 * Is data syncing in progress
 */
export const isDataSyncing = derived(
  authStore,
  $auth => $auth.isDataSyncing
);

/**
 * Data sync error message (if any)
 */
export const dataSyncError = derived(
  authStore,
  $auth => $auth.dataSyncError
);

/**
 * Has pending transactions that need uploading
 */
export const hasPendingTransactions = derived(
  authStore,
  $auth => $auth.pendingTransactionCount > 0
);

/**
 * Pending transaction count
 */
export const pendingTransactionCount = derived(
  authStore,
  $auth => $auth.pendingTransactionCount
);

/**
 * Is uploading transactions
 */
export const isUploadingSyncing = derived(
  authStore,
  $auth => $auth.isUploadingSyncing
);

/**
 * Upload sync error message (if any)
 */
export const uploadSyncError = derived(
  authStore,
  $auth => $auth.uploadSyncError
);
