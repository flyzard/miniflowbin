/**
 * Device Service
 *
 * Handles device activation, token refresh, and server communication.
 */

import * as authRepo from './authRepository';
import * as crypto from './cryptoService';
import type {
  ActivationResponse,
  RefreshResponse,
  ValidateResponse,
  ActivationResult
} from './types';
import { parseApiError } from '../utils/api';

const API_BASE = import.meta.env.VITE_FLOWBIN_API_URL || '';
const DEVICE_ID_KEY = 'flowbin_device_id';

// Temporary storage for tokens during activation (before PIN is set)
let pendingActivation: {
  deviceToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  refreshExpiresAt: string;
  user: ActivationResponse['user'];
  distributionCenter: ActivationResponse['distribution_center'];
  permissions: string[];
} | null = null;

// ─────────────────────────────────────────────────────────────
// Device ID Management
// ─────────────────────────────────────────────────────────────

/**
 * Get or create a unique device ID
 */
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = globalThis.crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Clear device ID
 */
export function clearDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY);
}

/**
 * Get human-readable device name from user agent
 */
export function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Android.*Mobile/.test(ua)) return 'Android Phone';
  if (/Android/.test(ua)) return 'Android Tablet';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Linux/.test(ua)) return 'Linux PC';
  return 'Unknown Device';
}

// ─────────────────────────────────────────────────────────────
// API Configuration Check
// ─────────────────────────────────────────────────────────────

/**
 * Check if API is configured
 */
export function isApiConfigured(): boolean {
  return !!API_BASE;
}

// ─────────────────────────────────────────────────────────────
// Device Activation
// ─────────────────────────────────────────────────────────────

/**
 * Activate device with server credentials
 * Note: This stores tokens temporarily until PIN is set up
 */
export async function activateDevice(
  email: string,
  password: string,
  deviceName?: string
): Promise<ActivationResult> {
  if (!API_BASE) {
    return { success: false, error: 'API URL not configured. Please set VITE_FLOWBIN_API_URL.' };
  }

  const deviceId = getOrCreateDeviceId();

  try {
    const response = await fetch(`${API_BASE}/device-auth/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        device_id: deviceId,
        device_name: deviceName || getDeviceName(),
      }),
    });

    if (!response.ok) {
      const errorData = await parseApiError(response);
      return { success: false, error: errorData.message };
    }

    const data: ActivationResponse = await response.json();

    // Clear existing data for fresh start
    await authRepo.clearAllDataForFreshStart();

    // Store tokens temporarily until PIN is set
    pendingActivation = {
      deviceToken: data.device_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: data.token_expires_at,
      refreshExpiresAt: data.refresh_expires_at,
      user: data.user,
      distributionCenter: data.distribution_center,
      permissions: data.permissions,
    };

    // Create the user record (without PIN yet)
    await authRepo.saveAuthUser({
      remote_user_id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role,
      permissions: JSON.stringify(data.permissions),
    });

    return { success: true, user: data.user };

  } catch (error) {
    console.error('[DeviceService] Activation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error. Please check your connection.'
    };
  }
}

/**
 * Check if there's a pending activation waiting for PIN setup
 */
export function hasPendingActivation(): boolean {
  return pendingActivation !== null;
}

/**
 * Get pending activation data
 */
export function getPendingActivation() {
  return pendingActivation;
}

/**
 * Complete activation by encrypting and saving tokens
 * IMPORTANT: setupPin() must be called BEFORE this function to establish the encryption key
 */
export async function completeActivation(): Promise<boolean> {
  if (!pendingActivation) {
    console.error('[DeviceService] No pending activation to complete');
    return false;
  }

  if (!crypto.hasEncryptionKey()) {
    console.error('[DeviceService] No encryption key available. Call setupPin() first.');
    return false;
  }

  try {
    // Encrypt tokens using the key already in memory (set by setupPin)
    const deviceTokenEncrypted = await crypto.encrypt(pendingActivation.deviceToken);
    const refreshTokenEncrypted = await crypto.encrypt(pendingActivation.refreshToken);

    // Save encrypted credentials to database
    await authRepo.saveDeviceCredentials({
      device_id: getOrCreateDeviceId(),
      device_token_encrypted: deviceTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      token_expires_at: pendingActivation.tokenExpiresAt,
      refresh_expires_at: pendingActivation.refreshExpiresAt,
    });

    // Clear pending activation
    pendingActivation = null;

    return true;
  } catch (error) {
    console.error('[DeviceService] Failed to complete activation:', error);
    return false;
  }
}

/**
 * Cancel pending activation
 */
export function cancelPendingActivation(): void {
  pendingActivation = null;
}

// ─────────────────────────────────────────────────────────────
// Token Refresh
// ─────────────────────────────────────────────────────────────

/**
 * Refresh device tokens
 * Requires encryption key to be set (user must be logged in)
 */
export async function refreshTokens(): Promise<boolean> {
  if (!API_BASE) return false;
  if (!crypto.hasEncryptionKey()) {
    console.warn('[DeviceService] Cannot refresh tokens: no encryption key');
    return false;
  }

  try {
    const credentials = await authRepo.getDeviceCredentials();
    if (!credentials) return false;

    // Decrypt current tokens
    const deviceToken = await crypto.decrypt(credentials.device_token_encrypted);
    const refreshToken = await crypto.decrypt(credentials.refresh_token_encrypted);

    const response = await fetch(`${API_BASE}/device-auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        device_token: deviceToken,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await parseApiError(response);
      console.warn('[DeviceService] Token refresh failed:', errorData.error);
      return false;
    }

    const data: RefreshResponse = await response.json();

    // Encrypt new tokens
    const newDeviceTokenEncrypted = await crypto.encrypt(data.device_token);
    const newRefreshTokenEncrypted = await crypto.encrypt(data.refresh_token);

    // Update stored credentials
    await authRepo.updateDeviceCredentials({
      device_token_encrypted: newDeviceTokenEncrypted,
      refresh_token_encrypted: newRefreshTokenEncrypted,
      token_expires_at: data.token_expires_at,
      refresh_expires_at: data.refresh_expires_at,
    });

    return true;

  } catch (error) {
    console.error('[DeviceService] Token refresh failed:', error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// Validation & Sync
// ─────────────────────────────────────────────────────────────

/**
 * Validate device and sync profile
 * Requires encryption key to be set (user must be logged in)
 */
export async function validateAndSync(): Promise<{
  valid: boolean;
  status?: 'active' | 'suspended' | 'revoked';
}> {
  if (!API_BASE) return { valid: false };
  if (!crypto.hasEncryptionKey()) {
    console.warn('[DeviceService] Cannot validate: no encryption key');
    return { valid: false };
  }

  try {
    const token = await getDecryptedDeviceToken();
    if (!token) return { valid: false };

    const response = await fetch(`${API_BASE}/device-auth/validate`, {
      method: 'GET',
      headers: {
        'X-Device-Token': token,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await parseApiError(response);

      if (errorData.error === 'device_revoked') {
        return { valid: false, status: 'revoked' };
      }
      if (errorData.error === 'device_suspended') {
        return { valid: false, status: 'suspended' };
      }
      if (errorData.error === 'token_expired') {
        // Try to refresh
        const refreshed = await refreshTokens();
        if (refreshed) {
          return validateAndSync(); // Retry
        }
      }

      return { valid: false };
    }

    const data: ValidateResponse = await response.json();

    // Update local user profile
    await authRepo.saveAuthUser({
      remote_user_id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role,
      permissions: JSON.stringify(data.permissions),
    });

    await authRepo.updateLastSync();

    return { valid: true, status: data.status };

  } catch (error) {
    console.error('[DeviceService] Validation failed:', error);
    // Don't fail hard if offline - continue with cached data
    return { valid: true }; // Assume valid if can't reach server
  }
}

/**
 * Get decrypted device token (for API calls)
 */
export async function getDecryptedDeviceToken(): Promise<string | null> {
  if (!crypto.hasEncryptionKey()) {
    return null;
  }

  try {
    const credentials = await authRepo.getDeviceCredentials();
    if (!credentials) return null;

    return await crypto.decrypt(credentials.device_token_encrypted);
  } catch (error) {
    console.error('[DeviceService] Failed to get device token:', error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Token Expiry Checks
// ─────────────────────────────────────────────────────────────

/**
 * Check if token is near expiry (within days)
 */
export function isTokenNearExpiry(expiresAt: Date, withinDays: number = 7): boolean {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + withinDays);
  return expiresAt < threshold;
}
