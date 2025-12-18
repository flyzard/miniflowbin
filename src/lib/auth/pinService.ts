/**
 * PIN Service
 *
 * Handles PIN setup, verification, and lockout logic.
 * Uses PBKDF2 for secure PIN hashing.
 */

import * as authRepo from './authRepository';
import * as crypto from './cryptoService';
import { AUTH_CONSTANTS, type PinVerifyResult, type PinSetupResult } from './types';

// ─────────────────────────────────────────────────────────────
// PIN Validation
// ─────────────────────────────────────────────────────────────

/**
 * Validate PIN format
 */
export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (pin.length < AUTH_CONSTANTS.MIN_PIN_LENGTH) {
    return { valid: false, error: `PIN must be at least ${AUTH_CONSTANTS.MIN_PIN_LENGTH} digits` };
  }
  if (pin.length > AUTH_CONSTANTS.MAX_PIN_LENGTH) {
    return { valid: false, error: `PIN must be at most ${AUTH_CONSTANTS.MAX_PIN_LENGTH} digits` };
  }
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only digits' };
  }
  // Check for simple patterns
  if (/^(\d)\1+$/.test(pin)) {
    return { valid: false, error: 'PIN cannot be all the same digit' };
  }
  // Check for sequential patterns like 1234
  if (isSequential(pin)) {
    return { valid: false, error: 'PIN cannot be a simple sequence' };
  }
  return { valid: true };
}

/**
 * Check if PIN is a simple sequential pattern
 */
function isSequential(pin: string): boolean {
  if (pin.length < 3) return false;

  let ascending = true;
  let descending = true;

  for (let i = 1; i < pin.length; i++) {
    const diff = parseInt(pin[i]!) - parseInt(pin[i - 1]!);
    if (diff !== 1) ascending = false;
    if (diff !== -1) descending = false;
  }

  return ascending || descending;
}

// ─────────────────────────────────────────────────────────────
// PIN Setup
// ─────────────────────────────────────────────────────────────

/**
 * Set up PIN for a user
 * @param userId User's ID
 * @param pin PIN to set
 * @returns Result indicating success or failure
 */
export async function setupPin(userId: string, pin: string): Promise<PinSetupResult> {
  // Validate format
  const validation = validatePinFormat(pin);
  if (!validation.valid) {
    return { success: false, error: validation.error! };
  }

  try {
    // Generate salt for this PIN
    const salt = crypto.generateSalt();
    const saltHex = crypto.uint8ArrayToHex(salt);

    // Hash the PIN
    const pinHash = await crypto.hashPin(pin, salt);

    // Store in database
    await authRepo.updateUserPin(userId, pinHash, saltHex);

    // Derive and set the encryption key from the PIN
    const encryptionKey = await crypto.deriveKeyFromPin(pin, salt);
    crypto.setEncryptionKey(encryptionKey);

    return { success: true };
  } catch (error) {
    console.error('[PIN] Setup failed:', error);
    return { success: false, error: 'Failed to set up PIN' };
  }
}

/**
 * Check if user has PIN set up
 */
export async function hasPinSetup(userId: string): Promise<boolean> {
  const user = await authRepo.getAuthUserById(userId);
  return !!user?.pin_hash && !!user?.pin_salt;
}

// ─────────────────────────────────────────────────────────────
// PIN Verification
// ─────────────────────────────────────────────────────────────

/**
 * Verify PIN and create session
 * Also derives and sets the encryption key for the session
 */
export async function verifyPin(userId: string, pin: string): Promise<PinVerifyResult> {
  const user = await authRepo.getAuthUserById(userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Check if locked out
  if (user.pin_locked_until) {
    const lockedUntil = new Date(user.pin_locked_until);
    if (lockedUntil > new Date()) {
      return {
        success: false,
        error: 'Account temporarily locked',
        lockedUntil
      };
    }
    // Lockout expired, reset attempts
    await authRepo.resetPinAttempts(userId);
  }

  // Check if PIN is set
  if (!user.pin_hash || !user.pin_salt) {
    return { success: false, error: 'PIN not set up' };
  }

  // Convert salt from hex
  const salt = crypto.hexToUint8Array(user.pin_salt);

  // Verify PIN hash
  const isValid = await crypto.verifyPinHash(pin, salt, user.pin_hash);

  if (!isValid) {
    // Wrong PIN - increment attempts
    const attempts = await authRepo.incrementPinAttempts(userId);
    const attemptsRemaining = AUTH_CONSTANTS.MAX_PIN_ATTEMPTS - attempts;

    if (attemptsRemaining <= 0) {
      // Lock the account
      const lockedUntil = new Date(
        Date.now() + AUTH_CONSTANTS.LOCKOUT_DURATION_MINUTES * 60 * 1000
      );
      await authRepo.lockUserPin(userId, lockedUntil);
      return {
        success: false,
        error: 'Too many failed attempts. Account locked.',
        lockedUntil
      };
    }

    return {
      success: false,
      error: 'Incorrect PIN',
      attemptsRemaining
    };
  }

  // PIN correct - reset attempts, derive encryption key, create session
  await authRepo.resetPinAttempts(userId);

  // Derive and set the encryption key from the PIN
  const encryptionKey = await crypto.deriveKeyFromPin(pin, salt);
  crypto.setEncryptionKey(encryptionKey);

  // Create auth session
  const sessionId = await authRepo.createAuthSession(userId, 'pin');
  await authRepo.updateLastLogin(userId);

  return { success: true, sessionId };
}

