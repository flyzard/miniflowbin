/**
 * Auth Type Definitions
 *
 * Types for device authentication, PIN/biometric login, and session management.
 */

// ============================================================================
// Auth Status
// ============================================================================

export type AuthStatus =
  | 'initializing'
  | 'not_activated'
  | 'activation_required'
  | 'login_required'
  | 'authenticated'
  | 'suspended'
  | 'revoked';

// ============================================================================
// Database Entities
// ============================================================================

/**
 * Device credentials stored locally (tokens are encrypted)
 */
export interface DeviceCredentials {
  id: number;
  device_id: string;
  device_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  refresh_expires_at: string;
  activated_at: string;
  last_sync_at: string | null;
}

/**
 * Extended User type with auth fields
 * Extends existing User table with auth-specific columns
 */
export interface AuthUser {
  id: string;
  username: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Auth-specific fields
  remote_user_id: number | null;
  email: string | null;
  pin_hash: string | null;
  pin_salt: string | null;
  pin_attempts: number;
  pin_locked_until: string | null;
  biometric_enabled: boolean;
  biometric_credential_id: string | null;
  permissions: string | null; // JSON array
  last_login_at: string | null;
  profile_synced_at: string | null;
}

/**
 * Auth session for audit trail
 */
export interface AuthSession {
  id: number;
  user_id: string;
  auth_method: 'pin' | 'biometric' | 'activation';
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
}

// ============================================================================
// API Response Types (from flowbin server)
// ============================================================================

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string | null;
  avatar_url: string | null;
}

export interface DistributionCenterInfo {
  id: number;
  name: string;
  code: string;
}

export interface ActivationResponse {
  success: boolean;
  device_token: string;
  refresh_token: string;
  token_expires_at: string;
  refresh_expires_at: string;
  user: UserProfile;
  distribution_center: DistributionCenterInfo | null;
  permissions: string[];
}

export interface RefreshResponse {
  success: boolean;
  device_token: string;
  refresh_token: string;
  token_expires_at: string;
  refresh_expires_at: string;
}

export interface ValidateResponse {
  status: 'active' | 'suspended' | 'revoked';
  token_expires_at: string;
  token_expires_in_days: number;
  user: UserProfile;
  distribution_center: DistributionCenterInfo | null;
  permissions: string[];
  server_time: string;
}

export interface ApiError {
  error: string;
  message: string;
}

// ============================================================================
// Service Result Types
// ============================================================================

export type ActivationResult =
  | { success: true; user: UserProfile }
  | { success: false; error: string };

export type PinVerifyResult =
  | { success: true; sessionId: number }
  | { success: false; error: string; attemptsRemaining?: number; lockedUntil?: Date };

export type BiometricResult =
  | { success: true; sessionId: number }
  | { success: false; error: string };

export type PinSetupResult =
  | { success: true }
  | { success: false; error: string };

// ============================================================================
// Store State
// ============================================================================

export interface AuthStoreState {
  status: AuthStatus;
  currentUser: AuthUser | null;
  deviceId: string | null;
  tokenExpiresAt: Date | null;
  lastSyncAt: Date | null;
  isOnline: boolean;
  syncError: string | null;
  sessionId: number | null;
  lastActivityAt: Date | null;
}

// ============================================================================
// Constants
// ============================================================================

export const AUTH_CONSTANTS = {
  /** PIN length range */
  MIN_PIN_LENGTH: 4,
  MAX_PIN_LENGTH: 6,

  /** Max failed PIN attempts before lockout */
  MAX_PIN_ATTEMPTS: 5,

  /** Lockout duration in minutes */
  LOCKOUT_DURATION_MINUTES: 15,

  /** PBKDF2 iterations for PIN hashing and key derivation */
  PBKDF2_ITERATIONS: 100000,

  /** Inactivity timeout in milliseconds (30 minutes) */
  INACTIVITY_TIMEOUT_MS: 30 * 60 * 1000,

  /** Background sync interval in milliseconds (4 hours) */
  SYNC_INTERVAL_MS: 4 * 60 * 60 * 1000,

  /** Minimum time between syncs in milliseconds (5 minutes) */
  SYNC_DEBOUNCE_MS: 5 * 60 * 1000,

  /** Days before token expiry to trigger refresh */
  TOKEN_REFRESH_THRESHOLD_DAYS: 7,
} as const;
