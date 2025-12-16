/**
 * Biometric Service
 *
 * Handles biometric authentication using WebAuthn API.
 *
 * Security note: Since we derive the encryption key from PIN,
 * biometric auth can only work when the key is already in memory
 * (i.e., user has logged in with PIN at least once since app start).
 * Biometric serves as a quick re-authentication method, not a
 * replacement for PIN on cold start.
 */

import * as authRepo from './authRepository';
import * as crypto from './cryptoService';
import { arrayBufferToBase64, base64ToArrayBuffer } from './cryptoService';
import type { BiometricResult } from './types';

// ─────────────────────────────────────────────────────────────
// Availability Check
// ─────────────────────────────────────────────────────────────

/**
 * Check if biometric authentication is available on this device
 */
export async function isBiometricAvailable(): Promise<boolean> {
  // Check if WebAuthn is supported
  if (!window.PublicKeyCredential) {
    return false;
  }

  try {
    // Check if platform authenticator is available (fingerprint, face ID, etc.)
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

/**
 * Check if user has biometric enabled
 */
export async function isBiometricEnabled(userId: string): Promise<boolean> {
  const user = await authRepo.getAuthUserById(userId);
  return !!user?.biometric_enabled && !!user?.biometric_credential_id;
}

/**
 * Check if biometric can be used right now
 * (requires encryption key to be in memory from previous PIN login)
 */
export function canUseBiometric(): boolean {
  return crypto.hasEncryptionKey();
}

// ─────────────────────────────────────────────────────────────
// Registration
// ─────────────────────────────────────────────────────────────

/**
 * Register biometric credential for a user
 * Must be called after user has logged in with PIN (key in memory)
 */
export async function registerBiometric(userId: string): Promise<boolean> {
  if (!crypto.hasEncryptionKey()) {
    console.error('[Biometric] Cannot register: encryption key not available');
    return false;
  }

  const user = await authRepo.getAuthUserById(userId);
  if (!user) {
    console.error('[Biometric] User not found');
    return false;
  }

  try {
    // Generate challenge
    const challenge = globalThis.crypto.getRandomValues(new Uint8Array(32));

    // Create credential options
    const createOptions: CredentialCreationOptions = {
      publicKey: {
        challenge,
        rp: {
          name: 'FlowBin',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: user.email || user.username,
          displayName: user.display_name,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Built-in authenticator only
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none', // We don't need attestation
      },
    };

    // Create credential
    const credential = await navigator.credentials.create(createOptions);

    if (!credential || !(credential instanceof PublicKeyCredential)) {
      console.error('[Biometric] Failed to create credential');
      return false;
    }

    // Store credential ID
    const credentialId = arrayBufferToBase64(credential.rawId);
    await authRepo.updateBiometricCredential(userId, credentialId);

    console.log('[Biometric] Registration successful');
    return true;

  } catch (error) {
    console.error('[Biometric] Registration failed:', error);
    return false;
  }
}

/**
 * Disable biometric for a user
 */
export async function disableBiometric(userId: string): Promise<void> {
  await authRepo.updateBiometricCredential(userId, null);
}

// ─────────────────────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────────────────────

/**
 * Authenticate using biometric
 * NOTE: This only works if encryption key is already in memory from a previous PIN login.
 * Biometric is meant for quick re-authentication, not cold start.
 */
export async function authenticateWithBiometric(userId: string): Promise<BiometricResult> {
  // Check if encryption key is available
  if (!crypto.hasEncryptionKey()) {
    return {
      success: false,
      error: 'Please enter your PIN first. Biometric is for quick re-authentication.'
    };
  }

  const user = await authRepo.getAuthUserById(userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!user.biometric_enabled || !user.biometric_credential_id) {
    return { success: false, error: 'Biometric not set up' };
  }

  try {
    // Generate challenge
    const challenge = globalThis.crypto.getRandomValues(new Uint8Array(32));

    // Convert stored credential ID back to ArrayBuffer
    const credentialId = base64ToArrayBuffer(user.biometric_credential_id);

    // Create assertion options
    const getOptions: CredentialRequestOptions = {
      publicKey: {
        challenge,
        allowCredentials: [{
          id: credentialId,
          type: 'public-key',
          transports: ['internal'],
        }],
        userVerification: 'required',
        timeout: 60000,
      },
    };

    // Get assertion
    const assertion = await navigator.credentials.get(getOptions);

    if (!assertion) {
      return { success: false, error: 'Biometric verification cancelled' };
    }

    // Create session
    const sessionId = await authRepo.createAuthSession(userId, 'biometric');
    await authRepo.updateLastLogin(userId);

    return { success: true, sessionId };

  } catch (error) {
    console.error('[Biometric] Authentication failed:', error);

    // Handle specific errors
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric verification cancelled' };
      }
      if (error.name === 'SecurityError') {
        return { success: false, error: 'Security error. Please try again.' };
      }
      if (error.name === 'InvalidStateError') {
        return { success: false, error: 'Biometric not available. Please use PIN.' };
      }
    }

    return { success: false, error: 'Biometric verification failed' };
  }
}
