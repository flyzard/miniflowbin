/**
 * Crypto Service
 *
 * Handles encryption/decryption of sensitive tokens using AES-GCM-256.
 * Key is derived from PIN using PBKDF2 (not stored in localStorage).
 *
 * Security design:
 * - Encryption key is derived from user's PIN using PBKDF2 with 100k iterations
 * - Key exists only in memory during authenticated sessions
 * - On logout or inactivity timeout, key is cleared from memory
 * - Salt is stored with encrypted data for key re-derivation
 */

import { AUTH_CONSTANTS } from './types';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits for PBKDF2 salt

// In-memory encryption key (cleared on logout/timeout)
let encryptionKey: CryptoKey | null = null;

// ─────────────────────────────────────────────────────────────
// Key Derivation (PBKDF2)
// ─────────────────────────────────────────────────────────────

/**
 * Derive an AES-256 key from a PIN using PBKDF2
 * @param pin User's PIN
 * @param salt Salt for key derivation (should be stored with encrypted data)
 */
export async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  // Import PIN as key material
  const pinKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES key using PBKDF2
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: AUTH_CONSTANTS.PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    pinKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

// ─────────────────────────────────────────────────────────────
// In-Memory Key Management
// ─────────────────────────────────────────────────────────────

/**
 * Set the encryption key in memory (after successful PIN verification)
 */
export function setEncryptionKey(key: CryptoKey): void {
  encryptionKey = key;
}

/**
 * Clear the encryption key from memory (on logout or timeout)
 */
export function clearEncryptionKey(): void {
  encryptionKey = null;
}

/**
 * Check if encryption key is available in memory
 */
export function hasEncryptionKey(): boolean {
  return encryptionKey !== null;
}

// ─────────────────────────────────────────────────────────────
// Encryption / Decryption
// ─────────────────────────────────────────────────────────────

/**
 * Encrypt a string value using the current in-memory key
 * Returns base64 encoded string containing IV + ciphertext
 * @throws Error if no encryption key is set
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!encryptionKey) {
    throw new Error('No encryption key available. User must be authenticated.');
  }

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedText = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    encryptionKey,
    encodedText
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt a string value using the current in-memory key
 * Expects base64 encoded string containing IV + ciphertext
 * @throws Error if no encryption key is set or decryption fails
 */
export async function decrypt(encryptedData: string): Promise<string> {
  if (!encryptionKey) {
    throw new Error('No encryption key available. User must be authenticated.');
  }

  const combined = base64ToArrayBuffer(encryptedData);
  const combinedArray = new Uint8Array(combined);

  const iv = combinedArray.slice(0, IV_LENGTH);
  const ciphertext = combinedArray.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    encryptionKey,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypt with a provided key (for initial encryption during activation)
 */
export async function encryptWithKey(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedText = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encodedText
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

// ─────────────────────────────────────────────────────────────
// PIN Hashing (PBKDF2)
// ─────────────────────────────────────────────────────────────

/**
 * Hash a PIN using PBKDF2 for storage verification
 * Returns hex-encoded hash
 */
export async function hashPin(pin: string, salt: Uint8Array): Promise<string> {
  const pinKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: AUTH_CONSTANTS.PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    pinKey,
    256 // 256 bits = 32 bytes
  );

  return arrayBufferToHex(hashBuffer);
}

/**
 * Verify a PIN against a stored hash
 */
export async function verifyPinHash(pin: string, salt: Uint8Array, storedHash: string): Promise<boolean> {
  const computedHash = await hashPin(pin, salt);
  return timingSafeEqual(computedHash, storedHash);
}

// ─────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to hex string
 */
export function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
export function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
