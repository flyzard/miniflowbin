# local-flowbin Device Authentication Implementation Guide

Complete implementation guide for adding hybrid device authentication to the **local-flowbin** PWA to integrate with the **flowbin** Laravel backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Configuration](#1-environment-configuration)
3. [Type Definitions](#2-type-definitions)
4. [Database Schema](#3-database-schema)
5. [Crypto Service](#4-crypto-service)
6. [Auth Repository](#5-auth-repository)
7. [Device Service](#6-device-service)
8. [PIN Service](#7-pin-service)
9. [Biometric Service](#8-biometric-service)
10. [Sync Service](#9-sync-service)
11. [Auth Store](#10-auth-store)
12. [Auth Initialization](#11-auth-initialization)
13. [Components](#12-components)
14. [Route Pages](#13-route-pages)
15. [App Integration](#14-app-integration)
16. [Testing](#15-testing)
17. [Implementation Checklist](#16-implementation-checklist)

---

## Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    local-flowbin AUTH ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   App.svelte                                                        │
│       │                                                             │
│       ▼                                                             │
│   initApp() ──► initDeviceAuth()                                    │
│       │              │                                              │
│       │              ├──► Check stored credentials                  │
│       │              ├──► Validate token expiry                     │
│       │              └──► Set auth status                           │
│       │                                                             │
│       ▼                                                             │
│   AuthGuard.svelte                                                  │
│       │                                                             │
│       ├──► not_activated ──► /auth/activate                         │
│       ├──► login_required ──► /auth/login                           │
│       ├──► authenticated ──► Protected routes                       │
│       └──► revoked/suspended ──► /auth/locked                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Auth States

| Status | Description | Action |
|--------|-------------|--------|
| `initializing` | App starting, checking credentials | Show loading |
| `not_activated` | No device credentials stored | Show activation |
| `activation_required` | Tokens expired/invalid | Show activation |
| `login_required` | Device valid, needs PIN/biometric | Show login |
| `authenticated` | Fully logged in | Allow access |
| `suspended` | Device suspended by admin | Show locked |
| `revoked` | Device permanently revoked | Show locked |

### File Structure

```
src/lib/
├── auth/
│   ├── types.ts              # Auth-specific types
│   ├── cryptoService.ts      # Token encryption (AES-GCM)
│   ├── authRepository.ts     # Database operations
│   ├── deviceService.ts      # Server communication
│   ├── pinService.ts         # PIN hash & verify
│   ├── biometricService.ts   # WebAuthn integration
│   ├── syncService.ts        # Background sync
│   ├── authStore.ts          # Svelte auth store
│   └── index.ts              # Auth initialization
├── components/
│   ├── AuthGuard.svelte      # Route protection
│   ├── PinInput.svelte       # PIN entry pad
│   └── BiometricPrompt.svelte # Biometric trigger
└── ...

src/routes/
├── auth/
│   ├── Activate.svelte       # Device activation
│   ├── SetupPin.svelte       # PIN setup
│   ├── Login.svelte          # Daily login
│   └── Locked.svelte         # Revoked/suspended
└── ...
```

---

## 1. Environment Configuration

### 1.1 Add Environment Variables

```bash
# .env
VITE_FLOWBIN_API_URL=https://flowbin.example.com/api
```

### 1.2 Update Vite Config Types

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLOWBIN_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## 2. Type Definitions

### 2.1 Auth Types

```typescript
// src/lib/auth/types.ts

/**
 * Auth-related type definitions
 */

// ─────────────────────────────────────────────────────────────
// Auth Status
// ─────────────────────────────────────────────────────────────

export type AuthStatus =
  | 'initializing'
  | 'not_activated'
  | 'activation_required'
  | 'login_required'
  | 'authenticated'
  | 'suspended'
  | 'revoked';

// ─────────────────────────────────────────────────────────────
// Database Entities
// ─────────────────────────────────────────────────────────────

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

export interface LocalUser {
  id: number;
  remote_user_id: number;
  email: string;
  name: string;
  role: string | null;
  avatar_url: string | null;
  pin_hash: string | null;
  pin_attempts: number;
  pin_locked_until: string | null;
  biometric_enabled: number;
  biometric_credential_id: string | null;
  distribution_center_id: number | null;
  permissions: string | null;
  last_login_at: string | null;
  profile_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  id: number;
  user_id: number;
  auth_method: 'pin' | 'biometric' | 'activation';
  started_at: string;
  ended_at: string | null;
  is_active: number;
}

// ─────────────────────────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Service Result Types
// ─────────────────────────────────────────────────────────────

export type ActivationResult =
  | { success: true; user: UserProfile }
  | { success: false; error: string };

export type PinVerifyResult =
  | { success: true; sessionId: number }
  | { success: false; error: string; attemptsRemaining?: number; lockedUntil?: Date };

export type BiometricResult =
  | { success: true; sessionId: number }
  | { success: false; error: string };

// ─────────────────────────────────────────────────────────────
// Store State
// ─────────────────────────────────────────────────────────────

export interface AuthStoreState {
  status: AuthStatus;
  currentUser: LocalUser | null;
  deviceId: string | null;
  tokenExpiresAt: Date | null;
  lastSyncAt: Date | null;
  isOnline: boolean;
  syncError: string | null;
  sessionId: number | null;
}
```

---

## 3. Database Schema

### 3.1 Update Schema Version

```typescript
// src/lib/db/schema.ts

// Update version number
export const SCHEMA_VERSION = 3; // Increment from current version

// Add to CREATE_TABLES_SQL (or create new migration)
export const AUTH_TABLES_SQL = `
-- Device credentials (encrypted tokens)
CREATE TABLE IF NOT EXISTS device_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT UNIQUE NOT NULL,
  device_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TEXT NOT NULL,
  refresh_expires_at TEXT NOT NULL,
  activated_at TEXT NOT NULL,
  last_sync_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_device_credentials_device_id ON device_credentials(device_id);

-- Local users cache (synced from server)
CREATE TABLE IF NOT EXISTS local_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  remote_user_id INTEGER UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  avatar_url TEXT,
  pin_hash TEXT,
  pin_attempts INTEGER NOT NULL DEFAULT 0,
  pin_locked_until TEXT,
  biometric_enabled INTEGER NOT NULL DEFAULT 0,
  biometric_credential_id TEXT,
  distribution_center_id INTEGER,
  permissions TEXT,
  last_login_at TEXT,
  profile_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_local_users_remote_id ON local_users(remote_user_id);
CREATE INDEX IF NOT EXISTS idx_local_users_email ON local_users(email);

-- Auth sessions (audit trail)
CREATE TABLE IF NOT EXISTS auth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  auth_method TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES local_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active ON auth_sessions(is_active);
`;
```

### 3.2 Add Migration

```typescript
// src/lib/db/migrations.ts

// Add to runMigrations() function:

// Migration v2 -> v3: Add auth tables
if (version === 2) {
  console.log('[Migrations] Running migration v2 -> v3: Add auth tables');
  await exec(AUTH_TABLES_SQL);
  version = 3;
  await recordVersion(3);
}
```

---

## 4. Crypto Service

Handles encryption/decryption of sensitive tokens using Web Crypto API.

```typescript
// src/lib/auth/cryptoService.ts

/**
 * Crypto Service
 *
 * Encrypts and decrypts sensitive data (tokens) using AES-GCM-256.
 * Uses Web Crypto API for secure operations.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const STORAGE_KEY = 'flowbin_encryption_key';

// ─────────────────────────────────────────────────────────────
// Key Management
// ─────────────────────────────────────────────────────────────

/**
 * Generate a new encryption key
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable for storage
    ['encrypt', 'decrypt']
  );
}

/**
 * Export key to base64 string for storage
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Import key from base64 string
 */
export async function importKey(keyData: string): Promise<CryptoKey> {
  const rawKey = base64ToArrayBuffer(keyData);
  return await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // not extractable after import
    ['encrypt', 'decrypt']
  );
}

/**
 * Get or create the encryption key
 */
export async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  const storedKey = localStorage.getItem(STORAGE_KEY);

  if (storedKey) {
    return await importKey(storedKey);
  }

  const newKey = await generateEncryptionKey();
  const exported = await exportKey(newKey);
  localStorage.setItem(STORAGE_KEY, exported);

  return newKey;
}

/**
 * Get stored encryption key (returns null if not exists)
 */
export async function getEncryptionKey(): Promise<CryptoKey | null> {
  const storedKey = localStorage.getItem(STORAGE_KEY);
  if (!storedKey) return null;
  return await importKey(storedKey);
}

/**
 * Clear the encryption key (used during device deactivation)
 */
export function clearEncryptionKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─────────────────────────────────────────────────────────────
// Encryption / Decryption
// ─────────────────────────────────────────────────────────────

/**
 * Encrypt a string value
 * Returns base64 encoded string containing IV + ciphertext
 */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedText = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encodedText
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt a string value
 * Expects base64 encoded string containing IV + ciphertext
 */
export async function decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
  const combined = base64ToArrayBuffer(encryptedData);
  const combinedArray = new Uint8Array(combined);

  const iv = combinedArray.slice(0, IV_LENGTH);
  const ciphertext = combinedArray.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// ─────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
```

---

## 5. Auth Repository

Database operations for auth-related tables.

```typescript
// src/lib/auth/authRepository.ts

/**
 * Auth Repository
 *
 * Database operations for device credentials, local users, and sessions.
 */

import { exec, query, queryOne, transaction } from '../db/database';
import { now } from '../types';
import type {
  DeviceCredentials,
  LocalUser,
  AuthSession,
  UserProfile
} from './types';

// ─────────────────────────────────────────────────────────────
// Device Credentials
// ─────────────────────────────────────────────────────────────

/**
 * Get stored device credentials
 */
export async function getDeviceCredentials(): Promise<DeviceCredentials | null> {
  return await queryOne<DeviceCredentials>(
    'SELECT * FROM device_credentials LIMIT 1'
  );
}

/**
 * Save device credentials (replaces existing)
 */
export async function saveDeviceCredentials(credentials: {
  device_id: string;
  device_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  refresh_expires_at: string;
}): Promise<void> {
  const timestamp = now();

  await transaction(async () => {
    // Clear existing credentials
    await exec('DELETE FROM device_credentials');

    // Insert new credentials
    await exec(
      `INSERT INTO device_credentials (
        device_id, device_token_encrypted, refresh_token_encrypted,
        token_expires_at, refresh_expires_at, activated_at, last_sync_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        credentials.device_id,
        credentials.device_token_encrypted,
        credentials.refresh_token_encrypted,
        credentials.token_expires_at,
        credentials.refresh_expires_at,
        timestamp,
        timestamp
      ]
    );
  });
}

/**
 * Update device credentials (tokens only)
 */
export async function updateDeviceCredentials(update: {
  device_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  refresh_expires_at: string;
}): Promise<void> {
  await exec(
    `UPDATE device_credentials SET
      device_token_encrypted = ?,
      refresh_token_encrypted = ?,
      token_expires_at = ?,
      refresh_expires_at = ?,
      last_sync_at = ?`,
    [
      update.device_token_encrypted,
      update.refresh_token_encrypted,
      update.token_expires_at,
      update.refresh_expires_at,
      now()
    ]
  );
}

/**
 * Update last sync timestamp
 */
export async function updateLastSync(): Promise<void> {
  await exec(
    'UPDATE device_credentials SET last_sync_at = ?',
    [now()]
  );
}

/**
 * Delete all device credentials
 */
export async function clearDeviceCredentials(): Promise<void> {
  await exec('DELETE FROM device_credentials');
}

// ─────────────────────────────────────────────────────────────
// Local Users
// ─────────────────────────────────────────────────────────────

/**
 * Get local user by ID
 */
export async function getLocalUserById(id: number): Promise<LocalUser | null> {
  return await queryOne<LocalUser>(
    'SELECT * FROM local_users WHERE id = ?',
    [id]
  );
}

/**
 * Get local user by remote ID
 */
export async function getLocalUserByRemoteId(remoteId: number): Promise<LocalUser | null> {
  return await queryOne<LocalUser>(
    'SELECT * FROM local_users WHERE remote_user_id = ?',
    [remoteId]
  );
}

/**
 * Get all local users
 */
export async function getAllLocalUsers(): Promise<LocalUser[]> {
  return await query<LocalUser>(
    'SELECT * FROM local_users ORDER BY name'
  );
}

/**
 * Get the primary local user (first one)
 */
export async function getPrimaryLocalUser(): Promise<LocalUser | null> {
  return await queryOne<LocalUser>(
    'SELECT * FROM local_users ORDER BY id LIMIT 1'
  );
}

/**
 * Save or update local user from server profile
 */
export async function saveLocalUser(profile: {
  remote_user_id: number;
  email: string;
  name: string;
  role?: string | null;
  avatar_url?: string | null;
  distribution_center_id?: number | null;
  permissions?: string;
}): Promise<LocalUser> {
  const timestamp = now();

  // Check if user exists
  const existing = await getLocalUserByRemoteId(profile.remote_user_id);

  if (existing) {
    // Update existing user
    await exec(
      `UPDATE local_users SET
        email = ?, name = ?, role = ?, avatar_url = ?,
        distribution_center_id = ?, permissions = ?,
        profile_synced_at = ?, updated_at = ?
      WHERE remote_user_id = ?`,
      [
        profile.email,
        profile.name,
        profile.role ?? null,
        profile.avatar_url ?? null,
        profile.distribution_center_id ?? null,
        profile.permissions ?? null,
        timestamp,
        timestamp,
        profile.remote_user_id
      ]
    );
    return (await getLocalUserByRemoteId(profile.remote_user_id))!;
  }

  // Insert new user
  await exec(
    `INSERT INTO local_users (
      remote_user_id, email, name, role, avatar_url,
      distribution_center_id, permissions, profile_synced_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.remote_user_id,
      profile.email,
      profile.name,
      profile.role ?? null,
      profile.avatar_url ?? null,
      profile.distribution_center_id ?? null,
      profile.permissions ?? null,
      timestamp,
      timestamp,
      timestamp
    ]
  );

  return (await getLocalUserByRemoteId(profile.remote_user_id))!;
}

/**
 * Update user's PIN hash
 */
export async function updateUserPin(userId: number, pinHash: string): Promise<void> {
  await exec(
    `UPDATE local_users SET
      pin_hash = ?, pin_attempts = 0, pin_locked_until = NULL, updated_at = ?
    WHERE id = ?`,
    [pinHash, now(), userId]
  );
}

/**
 * Increment PIN attempts
 */
export async function incrementPinAttempts(userId: number): Promise<void> {
  await exec(
    'UPDATE local_users SET pin_attempts = pin_attempts + 1 WHERE id = ?',
    [userId]
  );
}

/**
 * Lock user PIN (after too many attempts)
 */
export async function lockUserPin(userId: number, lockedUntil: Date): Promise<void> {
  await exec(
    'UPDATE local_users SET pin_locked_until = ? WHERE id = ?',
    [lockedUntil.toISOString(), userId]
  );
}

/**
 * Reset PIN attempts
 */
export async function resetPinAttempts(userId: number): Promise<void> {
  await exec(
    'UPDATE local_users SET pin_attempts = 0, pin_locked_until = NULL WHERE id = ?',
    [userId]
  );
}

/**
 * Update biometric credential
 */
export async function updateBiometricCredential(
  userId: number,
  credentialId: string | null
): Promise<void> {
  await exec(
    `UPDATE local_users SET
      biometric_enabled = ?, biometric_credential_id = ?, updated_at = ?
    WHERE id = ?`,
    [credentialId ? 1 : 0, credentialId, now(), userId]
  );
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(userId: number): Promise<void> {
  await exec(
    'UPDATE local_users SET last_login_at = ? WHERE id = ?',
    [now(), userId]
  );
}

/**
 * Delete all local users
 */
export async function clearLocalUsers(): Promise<void> {
  await exec('DELETE FROM local_users');
}

// ─────────────────────────────────────────────────────────────
// Auth Sessions
// ─────────────────────────────────────────────────────────────

/**
 * Create a new auth session
 */
export async function createAuthSession(
  userId: number,
  authMethod: 'pin' | 'biometric' | 'activation'
): Promise<number> {
  const timestamp = now();

  // End any active sessions for this user
  await exec(
    `UPDATE auth_sessions SET is_active = 0, ended_at = ?
    WHERE user_id = ? AND is_active = 1`,
    [timestamp, userId]
  );

  // Create new session
  await exec(
    `INSERT INTO auth_sessions (user_id, auth_method, started_at, is_active)
    VALUES (?, ?, ?, 1)`,
    [userId, authMethod, timestamp]
  );

  const session = await queryOne<{ id: number }>(
    'SELECT last_insert_rowid() as id'
  );

  return session?.id ?? 0;
}

/**
 * End an auth session
 */
export async function endAuthSession(sessionId: number): Promise<void> {
  await exec(
    'UPDATE auth_sessions SET is_active = 0, ended_at = ? WHERE id = ?',
    [now(), sessionId]
  );
}

/**
 * Get active session for user
 */
export async function getActiveSession(userId: number): Promise<AuthSession | null> {
  return await queryOne<AuthSession>(
    'SELECT * FROM auth_sessions WHERE user_id = ? AND is_active = 1',
    [userId]
  );
}

/**
 * Clear all auth sessions
 */
export async function clearAuthSessions(): Promise<void> {
  await exec('DELETE FROM auth_sessions');
}

// ─────────────────────────────────────────────────────────────
// Full Cleanup
// ─────────────────────────────────────────────────────────────

/**
 * Clear all auth data (for device deactivation)
 */
export async function clearAllAuthData(): Promise<void> {
  await transaction(async () => {
    await clearAuthSessions();
    await clearLocalUsers();
    await clearDeviceCredentials();
  });
}
```

---

## 6. Device Service

Handles communication with the flowbin server.

```typescript
// src/lib/auth/deviceService.ts

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
  ApiError,
  ActivationResult
} from './types';

const API_BASE = import.meta.env.VITE_FLOWBIN_API_URL || '';
const DEVICE_ID_KEY = 'flowbin_device_id';

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
 * Get device ID (returns null if not exists)
 */
export function getDeviceId(): string | null {
  return localStorage.getItem(DEVICE_ID_KEY);
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
// API Communication
// ─────────────────────────────────────────────────────────────

/**
 * Activate device with server credentials
 */
export async function activateDevice(
  email: string,
  password: string,
  deviceName?: string
): Promise<ActivationResult> {
  if (!API_BASE) {
    return { success: false, error: 'API URL not configured' };
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
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'unknown',
        message: `Server error: ${response.status}`
      }));
      return { success: false, error: errorData.message };
    }

    const data: ActivationResponse = await response.json();

    // Get or create encryption key
    const encryptionKey = await crypto.getOrCreateEncryptionKey();

    // Encrypt tokens before storing
    const encryptedDeviceToken = await crypto.encrypt(data.device_token, encryptionKey);
    const encryptedRefreshToken = await crypto.encrypt(data.refresh_token, encryptionKey);

    // Store credentials
    await authRepo.saveDeviceCredentials({
      device_id: deviceId,
      device_token_encrypted: encryptedDeviceToken,
      refresh_token_encrypted: encryptedRefreshToken,
      token_expires_at: data.token_expires_at,
      refresh_expires_at: data.refresh_expires_at,
    });

    // Store user profile
    await authRepo.saveLocalUser({
      remote_user_id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role,
      avatar_url: data.user.avatar_url,
      distribution_center_id: data.distribution_center?.id,
      permissions: JSON.stringify(data.permissions),
    });

    return { success: true, user: data.user };

  } catch (error) {
    console.error('[DeviceService] Activation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Refresh device tokens
 */
export async function refreshTokens(): Promise<boolean> {
  if (!API_BASE) return false;

  try {
    const credentials = await authRepo.getDeviceCredentials();
    if (!credentials) return false;

    const encryptionKey = await crypto.getEncryptionKey();
    if (!encryptionKey) return false;

    // Decrypt current tokens
    const deviceToken = await crypto.decrypt(
      credentials.device_token_encrypted,
      encryptionKey
    );
    const refreshToken = await crypto.decrypt(
      credentials.refresh_token_encrypted,
      encryptionKey
    );

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
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'unknown',
        message: 'Refresh failed'
      }));

      // Handle specific error cases
      if (errorData.error === 'device_revoked') {
        return false;
      }
      if (errorData.error === 'device_suspended') {
        return false;
      }
      if (errorData.error === 'refresh_token_expired') {
        return false;
      }

      return false;
    }

    const data: RefreshResponse = await response.json();

    // Encrypt new tokens
    const newEncryptedDeviceToken = await crypto.encrypt(data.device_token, encryptionKey);
    const newEncryptedRefreshToken = await crypto.encrypt(data.refresh_token, encryptionKey);

    // Update stored credentials
    await authRepo.updateDeviceCredentials({
      device_token_encrypted: newEncryptedDeviceToken,
      refresh_token_encrypted: newEncryptedRefreshToken,
      token_expires_at: data.token_expires_at,
      refresh_expires_at: data.refresh_expires_at,
    });

    return true;

  } catch (error) {
    console.error('[DeviceService] Token refresh failed:', error);
    return false;
  }
}

/**
 * Validate device and sync profile
 */
export async function validateAndSync(): Promise<{
  valid: boolean;
  status?: 'active' | 'suspended' | 'revoked';
}> {
  if (!API_BASE) return { valid: false };

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
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'unknown',
        message: 'Validation failed'
      }));

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
    await authRepo.saveLocalUser({
      remote_user_id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role,
      avatar_url: data.user.avatar_url,
      distribution_center_id: data.distribution_center?.id,
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
  try {
    const credentials = await authRepo.getDeviceCredentials();
    if (!credentials) return null;

    const encryptionKey = await crypto.getEncryptionKey();
    if (!encryptionKey) return null;

    return await crypto.decrypt(credentials.device_token_encrypted, encryptionKey);
  } catch {
    return null;
  }
}

/**
 * Check if token is near expiry (within days)
 */
export function isTokenNearExpiry(expiresAt: Date, withinDays: number = 7): boolean {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + withinDays);
  return expiresAt < threshold;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return expiresAt < new Date();
}
```

---

## 7. PIN Service

Handles PIN hashing and verification.

```typescript
// src/lib/auth/pinService.ts

/**
 * PIN Service
 *
 * Handles PIN setup, verification, and lockout logic.
 */

import * as authRepo from './authRepository';
import type { PinVerifyResult, LocalUser } from './types';

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 8;

// ─────────────────────────────────────────────────────────────
// PIN Hashing
// ─────────────────────────────────────────────────────────────

/**
 * Hash a PIN with salt using SHA-256
 */
async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random salt
 */
function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────────────────────
// PIN Management
// ─────────────────────────────────────────────────────────────

/**
 * Validate PIN format
 */
export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (pin.length < MIN_PIN_LENGTH) {
    return { valid: false, error: `PIN must be at least ${MIN_PIN_LENGTH} digits` };
  }
  if (pin.length > MAX_PIN_LENGTH) {
    return { valid: false, error: `PIN must be at most ${MAX_PIN_LENGTH} digits` };
  }
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only digits' };
  }
  // Check for simple patterns
  if (/^(\d)\1+$/.test(pin)) {
    return { valid: false, error: 'PIN cannot be all the same digit' };
  }
  return { valid: true };
}

/**
 * Set up PIN for a user
 */
export async function setupPin(userId: number, pin: string): Promise<{ success: boolean; error?: string }> {
  const validation = validatePinFormat(pin);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const salt = generateSalt();
  const pinHash = await hashPin(pin, salt);

  await authRepo.updateUserPin(userId, `${salt}:${pinHash}`);

  return { success: true };
}

/**
 * Check if user has PIN set up
 */
export async function hasPinSetup(userId: number): Promise<boolean> {
  const user = await authRepo.getLocalUserById(userId);
  return !!user?.pin_hash;
}

/**
 * Verify PIN and create session
 */
export async function verifyPin(userId: number, pin: string): Promise<PinVerifyResult> {
  const user = await authRepo.getLocalUserById(userId);

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
  if (!user.pin_hash) {
    return { success: false, error: 'PIN not set up' };
  }

  // Verify PIN
  const [salt, storedHash] = user.pin_hash.split(':');
  if (!salt || !storedHash) {
    return { success: false, error: 'Invalid PIN data' };
  }

  const inputHash = await hashPin(pin, salt);

  if (inputHash !== storedHash) {
    // Wrong PIN
    const attempts = (user.pin_attempts || 0) + 1;
    const attemptsRemaining = MAX_PIN_ATTEMPTS - attempts;

    if (attemptsRemaining <= 0) {
      // Lock the account
      const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      await authRepo.lockUserPin(userId, lockedUntil);
      return {
        success: false,
        error: 'Too many failed attempts. Account locked.',
        lockedUntil
      };
    }

    await authRepo.incrementPinAttempts(userId);
    return {
      success: false,
      error: 'Incorrect PIN',
      attemptsRemaining
    };
  }

  // PIN correct - reset attempts and create session
  await authRepo.resetPinAttempts(userId);
  const sessionId = await authRepo.createAuthSession(userId, 'pin');
  await authRepo.updateLastLogin(userId);

  return { success: true, sessionId };
}

/**
 * Change PIN (requires current PIN verification)
 */
export async function changePin(
  userId: number,
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  // Verify current PIN first
  const verification = await verifyPin(userId, currentPin);
  if (!verification.success) {
    return { success: false, error: verification.error };
  }

  // Set new PIN
  return await setupPin(userId, newPin);
}

/**
 * Get lockout info for a user
 */
export async function getLockoutInfo(userId: number): Promise<{
  isLocked: boolean;
  lockedUntil?: Date;
  attemptsRemaining: number;
}> {
  const user = await authRepo.getLocalUserById(userId);

  if (!user) {
    return { isLocked: false, attemptsRemaining: MAX_PIN_ATTEMPTS };
  }

  if (user.pin_locked_until) {
    const lockedUntil = new Date(user.pin_locked_until);
    if (lockedUntil > new Date()) {
      return { isLocked: true, lockedUntil, attemptsRemaining: 0 };
    }
  }

  return {
    isLocked: false,
    attemptsRemaining: MAX_PIN_ATTEMPTS - (user.pin_attempts || 0)
  };
}
```

---

## 8. Biometric Service

Handles WebAuthn-based biometric authentication.

```typescript
// src/lib/auth/biometricService.ts

/**
 * Biometric Service
 *
 * Handles biometric authentication using WebAuthn API.
 */

import * as authRepo from './authRepository';
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
export async function isBiometricEnabled(userId: number): Promise<boolean> {
  const user = await authRepo.getLocalUserById(userId);
  return !!user?.biometric_enabled && !!user?.biometric_credential_id;
}

// ─────────────────────────────────────────────────────────────
// Registration
// ─────────────────────────────────────────────────────────────

/**
 * Register biometric credential for a user
 */
export async function registerBiometric(userId: number): Promise<boolean> {
  const user = await authRepo.getLocalUserById(userId);
  if (!user) {
    console.error('[Biometric] User not found');
    return false;
  }

  try {
    // Generate challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // Create credential options
    const createOptions: CredentialCreationOptions = {
      publicKey: {
        challenge,
        rp: {
          name: 'FlowBin',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(String(user.remote_user_id)),
          name: user.email,
          displayName: user.name,
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
export async function disableBiometric(userId: number): Promise<void> {
  await authRepo.updateBiometricCredential(userId, null);
}

// ─────────────────────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────────────────────

/**
 * Authenticate using biometric
 */
export async function authenticateWithBiometric(userId: number): Promise<BiometricResult> {
  const user = await authRepo.getLocalUserById(userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!user.biometric_enabled || !user.biometric_credential_id) {
    return { success: false, error: 'Biometric not set up' };
  }

  try {
    // Generate challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));

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
        return { success: false, error: 'Security error. Try again.' };
      }
    }

    return { success: false, error: 'Biometric verification failed' };
  }
}

// ─────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
```

---

## 9. Sync Service

Handles background synchronization with the server.

```typescript
// src/lib/auth/syncService.ts

/**
 * Sync Service
 *
 * Handles background synchronization of auth state with the server.
 */

import * as deviceService from './deviceService';
import * as authRepo from './authRepository';
import { authStore } from './authStore';
import { get } from 'svelte/store';

const SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
const TOKEN_REFRESH_THRESHOLD_DAYS = 7;

let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

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
  setTimeout(() => performSync(), 5000);

  // Schedule periodic sync
  syncIntervalId = setInterval(performSync, SYNC_INTERVAL_MS);

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

// ─────────────────────────────────────────────────────────────
// Event Handlers
// ─────────────────────────────────────────────────────────────

function handleOnline(): void {
  console.log('[Sync] Back online, syncing...');
  performSync();
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    console.log('[Sync] App visible, syncing...');
    performSync();
  }
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

  const state = get(authStore);

  // Don't sync if not activated
  if (state.status === 'not_activated' || state.status === 'initializing') {
    return;
  }

  // Don't sync if offline
  if (!navigator.onLine) {
    console.log('[Sync] Offline, skipping sync');
    return;
  }

  isRunning = true;

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
      authStore.setStatus('activation_required');
      isRunning = false;
      return;
    }

    // Refresh if token is near expiry
    if (deviceService.isTokenNearExpiry(tokenExpiry, TOKEN_REFRESH_THRESHOLD_DAYS)) {
      console.log('[Sync] Token near expiry, refreshing...');
      const refreshed = await deviceService.refreshTokens();
      if (!refreshed) {
        console.warn('[Sync] Token refresh failed');
        authStore.setSyncError('Failed to refresh tokens');
      }
    }

    // Validate and sync profile
    console.log('[Sync] Validating device...');
    const result = await deviceService.validateAndSync();

    if (!result.valid) {
      if (result.status === 'revoked') {
        authStore.setStatus('revoked');
      } else if (result.status === 'suspended') {
        authStore.setStatus('suspended');
      }
      isRunning = false;
      return;
    }

    authStore.setLastSync(new Date());
    authStore.setSyncError(null);
    console.log('[Sync] Sync complete');

  } catch (error) {
    console.error('[Sync] Sync failed:', error);
    authStore.setSyncError('Sync failed');
  } finally {
    isRunning = false;
  }
}

/**
 * Manual sync trigger
 */
export async function manualSync(): Promise<boolean> {
  if (!navigator.onLine) {
    authStore.setSyncError('Cannot sync while offline');
    return false;
  }

  await performSync();
  return get(authStore).syncError === null;
}
```

---

## 10. Auth Store

Svelte store for auth state management.

```typescript
// src/lib/auth/authStore.ts

/**
 * Auth Store
 *
 * Centralized auth state management using Svelte stores.
 */

import { writable, derived, get } from 'svelte/store';
import type { AuthStatus, AuthStoreState, LocalUser } from './types';

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
};

// ─────────────────────────────────────────────────────────────
// Store Creation
// ─────────────────────────────────────────────────────────────

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthStoreState>(initialState);

  return {
    subscribe,

    // Status management
    setStatus: (status: AuthStatus) => {
      update(state => ({ ...state, status }));
    },

    // User management
    setUser: (user: LocalUser | null) => {
      update(state => ({
        ...state,
        currentUser: user,
        status: user ? 'authenticated' : state.status
      }));
    },

    // Device info
    setDeviceInfo: (deviceId: string, tokenExpiresAt: Date) => {
      update(state => ({
        ...state,
        deviceId,
        tokenExpiresAt
      }));
    },

    // Online status
    setOnline: (isOnline: boolean) => {
      update(state => ({ ...state, isOnline }));
    },

    // Sync status
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

    // Session management
    setSessionId: (sessionId: number | null) => {
      update(state => ({ ...state, sessionId }));
    },

    // Logout (keeps device activated)
    logout: () => {
      update(state => ({
        ...state,
        status: 'login_required',
        sessionId: null,
        currentUser: state.currentUser // Keep user data for login screen
      }));
    },

    // Full reset
    reset: () => {
      set({
        ...initialState,
        isOnline: navigator.onLine
      });
    },
  };
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
 * Can work offline (has valid cached credentials)
 */
export const canWorkOffline = derived(
  authStore,
  $auth => ['authenticated', 'login_required'].includes($auth.status)
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
```

---

## 11. Auth Initialization

Main auth initialization logic.

```typescript
// src/lib/auth/index.ts

/**
 * Auth Module Entry Point
 *
 * Exports all auth functionality and handles initialization.
 */

import { authStore } from './authStore';
import * as authRepo from './authRepository';
import * as deviceService from './deviceService';
import * as crypto from './cryptoService';
import { startBackgroundSync, stopBackgroundSync } from './syncService';
import type { AuthStatus } from './types';

// Re-export everything
export * from './types';
export * from './authStore';
export * from './deviceService';
export * from './pinService';
export * from './biometricService';
export * from './syncService';
export * from './authRepository';

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

  // Set up online/offline listeners
  window.addEventListener('online', () => authStore.setOnline(true));
  window.addEventListener('offline', () => authStore.setOnline(false));

  try {
    // Check for stored device credentials
    const credentials = await authRepo.getDeviceCredentials();

    if (!credentials) {
      console.log('[Auth] No credentials found');
      authStore.setStatus('not_activated');
      return;
    }

    // Verify encryption key exists
    const encryptionKey = await crypto.getEncryptionKey();
    if (!encryptionKey) {
      console.log('[Auth] Encryption key missing');
      authStore.setStatus('activation_required');
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
      console.log('[Auth] Refresh token expired');
      authStore.setStatus('activation_required');
      return;
    }

    // Load local user
    const user = await authRepo.getPrimaryLocalUser();
    if (!user) {
      console.log('[Auth] No local user found');
      authStore.setStatus('activation_required');
      return;
    }

    // Store user info (but not authenticated yet - needs PIN)
    authStore.setUser(null); // Clear until PIN verified
    (authStore as any).update((state: any) => ({ ...state, currentUser: user }));

    // If online and token expired, try to refresh
    if (navigator.onLine && tokenExpiry < now) {
      console.log('[Auth] Token expired, attempting refresh...');
      const refreshed = await deviceService.refreshTokens();
      if (!refreshed) {
        authStore.setStatus('activation_required');
        return;
      }
    }

    // Start background sync
    startBackgroundSync();

    // Check if user has PIN set up
    if (!user.pin_hash) {
      // Needs PIN setup (first time after activation)
      console.log('[Auth] PIN not set up');
      authStore.setStatus('login_required'); // Will redirect to setup
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
  authStore.setStatus('not_activated');

  console.log('[Auth] Device deactivated');
}

/**
 * Logout current session (keeps device activated)
 */
export async function logout(): Promise<void> {
  const state = authStore;

  // End current session if exists
  // This would need access to sessionId from store

  authStore.logout();
}
```

---

## 12. Components

### 12.1 AuthGuard Component

```svelte
<!-- src/lib/components/AuthGuard.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { authStore, authStatus } from '../auth/authStore';

  // Whether this route requires authentication
  export let requireAuth: boolean = true;

  let ready = false;

  $: status = $authStatus;

  onMount(() => {
    // Wait for auth initialization
    const unsubscribe = authStore.subscribe(state => {
      if (state.status === 'initializing') return;

      ready = true;

      if (!requireAuth) return;

      // Redirect based on auth state
      switch (state.status) {
        case 'not_activated':
        case 'activation_required':
          push('/auth/activate');
          break;
        case 'revoked':
        case 'suspended':
          push('/auth/locked');
          break;
        case 'login_required':
          push('/auth/login');
          break;
        case 'authenticated':
          // Good to go
          break;
      }
    });

    return unsubscribe;
  });
</script>

{#if !ready}
  <div class="auth-loading">
    <div class="spinner"></div>
    <span>Loading...</span>
  </div>
{:else if !requireAuth || status === 'authenticated'}
  <slot />
{:else}
  <!-- Redirecting... -->
  <div class="auth-loading">
    <div class="spinner"></div>
  </div>
{/if}

<style>
  .auth-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    min-height: 100dvh;
    gap: var(--space-md);
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border-subtle);
    border-top-color: var(--color-accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
```

### 12.2 PinInput Component

```svelte
<!-- src/lib/components/PinInput.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let length: number = 6;
  export let error: string = '';
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{ complete: string; change: string }>();

  let pin: string = '';
  let dots: boolean[] = Array(length).fill(false);

  function handleKeyPress(digit: string) {
    if (disabled || pin.length >= length) return;

    pin += digit;
    dots[pin.length - 1] = true;
    dots = dots;

    dispatch('change', pin);

    if (pin.length === length) {
      dispatch('complete', pin);
    }
  }

  function handleBackspace() {
    if (disabled || pin.length === 0) return;

    dots[pin.length - 1] = false;
    dots = dots;
    pin = pin.slice(0, -1);

    dispatch('change', pin);
  }

  export function clear() {
    pin = '';
    dots = Array(length).fill(false);
  }

  const keypad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'back']
  ];
</script>

<div class="pin-input" class:disabled>
  <!-- PIN dots display -->
  <div class="pin-dots">
    {#each dots as filled}
      <div class="dot" class:filled></div>
    {/each}
  </div>

  <!-- Error message -->
  {#if error}
    <div class="error">{error}</div>
  {/if}

  <!-- Keypad -->
  <div class="keypad">
    {#each keypad as row}
      <div class="row">
        {#each row as key}
          {#if key === ''}
            <div class="key empty"></div>
          {:else if key === 'back'}
            <button
              type="button"
              class="key backspace"
              on:click={handleBackspace}
              {disabled}
              aria-label="Backspace"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                <path d="M18 9l-6 6M12 9l6 6"/>
              </svg>
            </button>
          {:else}
            <button
              type="button"
              class="key"
              on:click={() => handleKeyPress(key)}
              {disabled}
            >
              {key}
            </button>
          {/if}
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .pin-input {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-lg);
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
  }

  .pin-input.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .pin-dots {
    display: flex;
    gap: var(--space-md);
    padding: var(--space-lg) 0;
  }

  .dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--color-border-subtle);
    background: transparent;
    transition: all var(--transition-fast);
  }

  .dot.filled {
    background: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
  }

  .error {
    color: var(--color-accent-error);
    font-size: var(--font-size-secondary);
    text-align: center;
    padding: var(--space-sm) var(--space-md);
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--radius-button);
    width: 100%;
  }

  .keypad {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    width: 100%;
  }

  .row {
    display: flex;
    justify-content: center;
    gap: var(--space-sm);
  }

  .key {
    width: 80px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    background: var(--color-bg-input);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-button);
    cursor: pointer;
    transition: all var(--transition-fast);
    -webkit-tap-highlight-color: transparent;
  }

  .key:active:not(:disabled) {
    background: var(--color-border-subtle);
    transform: scale(0.95);
  }

  .key.empty {
    background: transparent;
    border: none;
    cursor: default;
  }

  .key.backspace {
    background: transparent;
    border: none;
  }

  .key.backspace svg {
    width: 28px;
    height: 28px;
  }

  .key:disabled {
    cursor: not-allowed;
  }
</style>
```

### 12.3 Update Component Index

```typescript
// src/lib/components/index.ts

// Add to existing exports:
export { default as AuthGuard } from './AuthGuard.svelte';
export { default as PinInput } from './PinInput.svelte';
```

---

## 13. Route Pages

### 13.1 Activate Page

```svelte
<!-- src/routes/auth/Activate.svelte -->
<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { Button, LoadingSpinner } from '$lib/components';
  import { activateDevice } from '$lib/auth/deviceService';
  import { authStore } from '$lib/auth/authStore';

  let email = '';
  let password = '';
  let deviceName = '';
  let loading = false;
  let error = '';

  async function handleSubmit() {
    if (!email || !password) {
      error = 'Please enter email and password';
      return;
    }

    loading = true;
    error = '';

    const result = await activateDevice(email, password, deviceName || undefined);

    loading = false;

    if (result.success) {
      // Go to PIN setup
      push('/auth/setup-pin');
    } else {
      error = result.error;
    }
  }
</script>

<div class="activate-page safe-area-top safe-area-bottom">
  <div class="header">
    <h1>Activate Device</h1>
    <p class="text-secondary">Sign in with your FlowBin account</p>
  </div>

  <form on:submit|preventDefault={handleSubmit}>
    <div class="field">
      <label for="email">Email</label>
      <input
        id="email"
        type="email"
        bind:value={email}
        placeholder="your@email.com"
        autocomplete="email"
        disabled={loading}
        required
      />
    </div>

    <div class="field">
      <label for="password">Password</label>
      <input
        id="password"
        type="password"
        bind:value={password}
        placeholder="••••••••"
        autocomplete="current-password"
        disabled={loading}
        required
      />
    </div>

    <div class="field">
      <label for="deviceName">Device Name <span class="optional">(optional)</span></label>
      <input
        id="deviceName"
        type="text"
        bind:value={deviceName}
        placeholder="Warehouse Tablet #3"
        disabled={loading}
      />
    </div>

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <Button type="submit" disabled={loading} fullWidth>
      {#if loading}
        Activating...
      {:else}
        Activate Device
      {/if}
    </Button>
  </form>

  <div class="footer">
    <p class="text-secondary">
      Don't have an account?<br/>
      Contact your administrator.
    </p>
  </div>
</div>

<style>
  .activate-page {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    padding: var(--space-xl);
    background: var(--color-bg-primary);
  }

  .header {
    text-align: center;
    margin-bottom: var(--space-xl);
  }

  .header h1 {
    margin-bottom: var(--space-sm);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    flex: 1;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .field label {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .field .optional {
    font-weight: normal;
  }

  .field input {
    height: var(--button-height);
    padding: 0 var(--space-md);
    background: var(--color-bg-input);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-input);
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
  }

  .field input:focus {
    border-color: var(--color-border-focus);
  }

  .field input::placeholder {
    color: var(--color-text-secondary);
    opacity: 0.5;
  }

  .error-message {
    padding: var(--space-md);
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--color-accent-error);
    border-radius: var(--radius-button);
    color: var(--color-accent-error);
    text-align: center;
  }

  .footer {
    margin-top: auto;
    padding-top: var(--space-xl);
    text-align: center;
  }
</style>
```

### 13.2 SetupPin Page

```svelte
<!-- src/routes/auth/SetupPin.svelte -->
<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { Button, PinInput } from '$lib/components';
  import { setupPin } from '$lib/auth/pinService';
  import { isBiometricAvailable, registerBiometric } from '$lib/auth/biometricService';
  import { getPrimaryLocalUser } from '$lib/auth/authRepository';
  import { onMount } from 'svelte';

  type Step = 'enter' | 'confirm' | 'biometric';

  let step: Step = 'enter';
  let pin = '';
  let confirmPin = '';
  let error = '';
  let loading = false;
  let biometricAvailable = false;
  let userId: number | null = null;
  let pinInputRef: PinInput;

  onMount(async () => {
    biometricAvailable = await isBiometricAvailable();
    const user = await getPrimaryLocalUser();
    if (user) {
      userId = user.id;
    }
  });

  function handlePinComplete(event: CustomEvent<string>) {
    const enteredPin = event.detail;

    if (step === 'enter') {
      pin = enteredPin;
      step = 'confirm';
      error = '';
      // Clear for confirmation
      setTimeout(() => pinInputRef?.clear(), 100);
    } else if (step === 'confirm') {
      confirmPin = enteredPin;
      if (pin === confirmPin) {
        savePin();
      } else {
        error = 'PINs do not match. Try again.';
        step = 'enter';
        pin = '';
        confirmPin = '';
        setTimeout(() => pinInputRef?.clear(), 100);
      }
    }
  }

  async function savePin() {
    if (!userId) {
      error = 'User not found';
      return;
    }

    loading = true;
    const result = await setupPin(userId, pin);
    loading = false;

    if (!result.success) {
      error = result.error || 'Failed to save PIN';
      step = 'enter';
      pin = '';
      confirmPin = '';
      setTimeout(() => pinInputRef?.clear(), 100);
      return;
    }

    if (biometricAvailable) {
      step = 'biometric';
    } else {
      push('/auth/login');
    }
  }

  async function enableBiometric() {
    if (!userId) return;

    loading = true;
    const success = await registerBiometric(userId);
    loading = false;

    if (success) {
      push('/auth/login');
    } else {
      error = 'Failed to enable biometric. You can try again in settings.';
    }
  }

  function skipBiometric() {
    push('/auth/login');
  }
</script>

<div class="setup-pin-page safe-area-top safe-area-bottom">
  {#if step === 'enter'}
    <div class="header">
      <h1>Create PIN</h1>
      <p class="text-secondary">Enter a 4-6 digit PIN for quick access</p>
    </div>

    <PinInput
      bind:this={pinInputRef}
      on:complete={handlePinComplete}
      {error}
      disabled={loading}
    />

  {:else if step === 'confirm'}
    <div class="header">
      <h1>Confirm PIN</h1>
      <p class="text-secondary">Enter your PIN again to confirm</p>
    </div>

    <PinInput
      bind:this={pinInputRef}
      on:complete={handlePinComplete}
      {error}
      disabled={loading}
    />

  {:else if step === 'biometric'}
    <div class="header">
      <h1>Enable Biometric?</h1>
      <p class="text-secondary">Use fingerprint or face recognition for faster login</p>
    </div>

    <div class="biometric-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-2 4-2 6"/>
        <path d="M8 15c0-2.2 1.8-4 4-4"/>
        <path d="M12 3c4.97 0 9 4.03 9 9 0 1.77-.5 3.42-1.38 4.81"/>
        <path d="M3 12c0-4.97 4.03-9 9-9"/>
        <path d="M17.32 18.32C15.8 19.93 13.99 21 12 21c-4.97 0-9-4.03-9-9"/>
      </svg>
    </div>

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <div class="biometric-actions">
      <Button on:click={enableBiometric} disabled={loading} fullWidth>
        {loading ? 'Setting up...' : 'Enable Biometric'}
      </Button>
      <Button variant="secondary" on:click={skipBiometric} disabled={loading} fullWidth>
        Skip for Now
      </Button>
    </div>
  {/if}
</div>

<style>
  .setup-pin-page {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-xl);
    background: var(--color-bg-primary);
  }

  .header {
    text-align: center;
    margin-bottom: var(--space-xl);
  }

  .header h1 {
    margin-bottom: var(--space-sm);
  }

  .biometric-icon {
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: var(--space-xl) 0;
    color: var(--color-accent-primary);
  }

  .biometric-icon svg {
    width: 100%;
    height: 100%;
  }

  .error-message {
    padding: var(--space-md);
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--color-accent-error);
    border-radius: var(--radius-button);
    color: var(--color-accent-error);
    text-align: center;
    margin-bottom: var(--space-md);
    width: 100%;
    max-width: 320px;
  }

  .biometric-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    width: 100%;
    max-width: 320px;
    margin-top: auto;
  }
</style>
```

### 13.3 Login Page

```svelte
<!-- src/routes/auth/Login.svelte -->
<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { PinInput } from '$lib/components';
  import { verifyPin, hasPinSetup } from '$lib/auth/pinService';
  import {
    isBiometricAvailable,
    isBiometricEnabled,
    authenticateWithBiometric
  } from '$lib/auth/biometricService';
  import { getPrimaryLocalUser } from '$lib/auth/authRepository';
  import { authStore } from '$lib/auth/authStore';
  import { onMount } from 'svelte';
  import type { LocalUser } from '$lib/auth/types';

  let user: LocalUser | null = null;
  let error = '';
  let attemptsRemaining: number | undefined;
  let lockedUntil: Date | undefined;
  let biometricAvailable = false;
  let biometricEnabled = false;
  let loading = false;
  let pinInputRef: PinInput;

  onMount(async () => {
    user = await getPrimaryLocalUser();

    if (!user) {
      push('/auth/activate');
      return;
    }

    // Check if PIN is set up
    const hasPin = await hasPinSetup(user.id);
    if (!hasPin) {
      push('/auth/setup-pin');
      return;
    }

    // Check biometric availability
    biometricAvailable = await isBiometricAvailable();
    if (biometricAvailable && user) {
      biometricEnabled = await isBiometricEnabled(user.id);
    }

    // Auto-prompt biometric if available and enabled
    if (biometricAvailable && biometricEnabled) {
      attemptBiometric();
    }
  });

  async function handlePinComplete(event: CustomEvent<string>) {
    if (!user || loading) return;

    const pin = event.detail;
    error = '';
    loading = true;

    const result = await verifyPin(user.id, pin);

    loading = false;

    if (result.success) {
      authStore.setUser(user);
      authStore.setSessionId(result.sessionId);
      push('/');
    } else {
      error = result.error;
      attemptsRemaining = result.attemptsRemaining;
      lockedUntil = result.lockedUntil;
      pinInputRef?.clear();
    }
  }

  async function attemptBiometric() {
    if (!user || loading) return;

    loading = true;
    const result = await authenticateWithBiometric(user.id);
    loading = false;

    if (result.success) {
      authStore.setUser(user);
      authStore.setSessionId(result.sessionId);
      push('/');
    }
    // Silently fail for biometric - user can use PIN
  }

  function formatLockoutTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="login-page safe-area-top safe-area-bottom">
  {#if user}
    <div class="user-info">
      <div class="avatar">
        {user.name.charAt(0).toUpperCase()}
      </div>
      <h2>{user.name}</h2>
      <p class="text-secondary">{user.email}</p>
    </div>

    {#if lockedUntil && lockedUntil > new Date()}
      <div class="locked-message">
        <p>Account temporarily locked</p>
        <p class="text-secondary">Try again at {formatLockoutTime(lockedUntil)}</p>
      </div>
    {:else}
      <p class="instruction">Enter your PIN</p>

      <PinInput
        bind:this={pinInputRef}
        on:complete={handlePinComplete}
        error={error}
        disabled={loading}
      />

      {#if attemptsRemaining !== undefined && attemptsRemaining < 5}
        <p class="attempts-warning">
          {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
        </p>
      {/if}

      {#if biometricAvailable && biometricEnabled}
        <button
          class="biometric-button"
          on:click={attemptBiometric}
          disabled={loading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-2 4-2 6"/>
            <path d="M8 15c0-2.2 1.8-4 4-4"/>
            <path d="M12 3c4.97 0 9 4.03 9 9 0 1.77-.5 3.42-1.38 4.81"/>
          </svg>
          <span>Use Biometric</span>
        </button>
      {/if}
    {/if}
  {:else}
    <div class="loading">
      <div class="spinner"></div>
    </div>
  {/if}
</div>

<style>
  .login-page {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-xl);
    background: var(--color-bg-primary);
  }

  .user-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: var(--space-xl);
  }

  .avatar {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-input);
    border-radius: 50%;
    font-size: 32px;
    font-weight: var(--font-weight-bold);
    color: var(--color-accent-primary);
    margin-bottom: var(--space-md);
  }

  .user-info h2 {
    margin-bottom: var(--space-xs);
  }

  .instruction {
    margin-bottom: var(--space-lg);
    color: var(--color-text-secondary);
  }

  .locked-message {
    text-align: center;
    padding: var(--space-xl);
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--radius-card);
    margin: var(--space-xl) 0;
  }

  .locked-message p:first-child {
    color: var(--color-accent-error);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-sm);
  }

  .attempts-warning {
    margin-top: var(--space-md);
    color: var(--color-accent-warning);
    font-size: var(--font-size-secondary);
  }

  .biometric-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    margin-top: var(--space-xl);
    padding: var(--space-md) var(--space-lg);
    background: transparent;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-button);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .biometric-button:active:not(:disabled) {
    background: var(--color-bg-input);
  }

  .biometric-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .biometric-button svg {
    width: 24px;
    height: 24px;
  }

  .loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border-subtle);
    border-top-color: var(--color-accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
</style>
```

### 13.4 Locked Page

```svelte
<!-- src/routes/auth/Locked.svelte -->
<script lang="ts">
  import { Button } from '$lib/components';
  import { authStore, authStatus } from '$lib/auth/authStore';
  import { deactivateDevice } from '$lib/auth';
  import { push } from 'svelte-spa-router';

  $: status = $authStatus;
  $: isRevoked = status === 'revoked';
  $: isSuspended = status === 'suspended';

  let showDeactivateConfirm = false;

  async function handleDeactivate() {
    await deactivateDevice();
    push('/auth/activate');
  }
</script>

<div class="locked-page safe-area-top safe-area-bottom">
  <div class="icon" class:revoked={isRevoked} class:suspended={isSuspended}>
    {#if isRevoked}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M15 9l-6 6M9 9l6 6"/>
      </svg>
    {:else}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    {/if}
  </div>

  <h1>
    {#if isRevoked}
      Device Revoked
    {:else}
      Device Suspended
    {/if}
  </h1>

  <p class="text-secondary">
    {#if isRevoked}
      This device has been permanently revoked and can no longer access FlowBin.
      Contact your administrator for assistance.
    {:else}
      This device has been temporarily suspended.
      Contact your administrator to restore access.
    {/if}
  </p>

  <div class="actions">
    {#if !showDeactivateConfirm}
      <Button variant="secondary" on:click={() => showDeactivateConfirm = true} fullWidth>
        Deactivate Device
      </Button>
    {:else}
      <div class="confirm-box">
        <p>This will remove all local data. Are you sure?</p>
        <div class="confirm-actions">
          <Button variant="secondary" on:click={() => showDeactivateConfirm = false}>
            Cancel
          </Button>
          <Button on:click={handleDeactivate}>
            Confirm
          </Button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .locked-page {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    background: var(--color-bg-primary);
    text-align: center;
  }

  .icon {
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-xl);
    color: var(--color-accent-warning);
  }

  .icon.revoked {
    color: var(--color-accent-error);
  }

  .icon svg {
    width: 100%;
    height: 100%;
  }

  h1 {
    margin-bottom: var(--space-md);
  }

  p {
    max-width: 300px;
    margin-bottom: var(--space-xl);
  }

  .actions {
    width: 100%;
    max-width: 300px;
    margin-top: auto;
  }

  .confirm-box {
    padding: var(--space-lg);
    background: var(--color-bg-card);
    border-radius: var(--radius-card);
  }

  .confirm-box p {
    margin-bottom: var(--space-md);
    max-width: none;
  }

  .confirm-actions {
    display: flex;
    gap: var(--space-md);
  }

  .confirm-actions :global(.btn) {
    flex: 1;
  }
</style>
```

---

## 14. App Integration

### 14.1 Update init.ts

```typescript
// src/lib/init.ts

import { initDatabase } from './db/database';
import { initializeSchema } from './db/migrations';
import { initDeviceAuth } from './auth';
import { initDistributionCenter } from './stores/distributionCenter';

let initialized = false;

/**
 * Initialize the application
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

    // Run migrations (includes auth tables)
    await initializeSchema();
    console.log('[Init] Schema initialized');

    // Initialize device auth (replaces old initAuth)
    await initDeviceAuth();
    console.log('[Init] Device auth initialized');

    // Initialize distribution center
    await initDistributionCenter();
    console.log('[Init] Distribution center initialized');

    initialized = true;
    console.log('[Init] App initialization complete');
  } catch (error) {
    console.error('[Init] Initialization failed:', error);
    throw error;
  }
}

export function isAppInitialized(): boolean {
  return initialized;
}
```

### 14.2 Update App.svelte

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Router from 'svelte-spa-router';
  import { initApp } from './lib/init';
  import { Toast, LoadingSpinner, AuthGuard } from './lib/components';

  // Import all routes
  import Home from './routes/Home.svelte';
  import ReceiveStep1 from './routes/receive/Step1.svelte';
  import ReceiveStep2 from './routes/receive/Step2.svelte';
  import ReleaseStep1 from './routes/release/Step1.svelte';
  import ReleaseStep2 from './routes/release/Step2.svelte';
  import ReleaseStep3 from './routes/release/Step3.svelte';

  // Auth routes
  import Activate from './routes/auth/Activate.svelte';
  import SetupPin from './routes/auth/SetupPin.svelte';
  import Login from './routes/auth/Login.svelte';
  import Locked from './routes/auth/Locked.svelte';

  // Route definitions
  const routes = {
    // Auth routes (no guard needed - they handle their own logic)
    '/auth/activate': Activate,
    '/auth/setup-pin': SetupPin,
    '/auth/login': Login,
    '/auth/locked': Locked,

    // Protected routes
    '/': Home,
    '/receive': ReceiveStep1,
    '/receive/confirm': ReceiveStep2,
    '/release': ReleaseStep1,
    '/release/source': ReleaseStep2,
    '/release/confirm': ReleaseStep3,

    // Fallback
    '*': Home
  };

  let isInitialized = false;
  let initError: string | null = null;

  onMount(async () => {
    try {
      await initApp();
      isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize app:', error);
      initError = error instanceof Error ? error.message : 'Unknown initialization error';
    }
  });
</script>

{#if initError}
  <div class="error-screen">
    <h1>Initialization Error</h1>
    <p>{initError}</p>
    <button on:click={() => window.location.reload()}>Retry</button>
  </div>
{:else if !isInitialized}
  <div class="loading-screen">
    <LoadingSpinner message="Initializing FlowBin..." size="large" />
  </div>
{:else}
  <AuthGuard>
    <Router {routes} />
  </AuthGuard>
  <Toast />
{/if}

<style>
  /* ... existing styles ... */
</style>
```

---

## 15. Testing

### 15.1 Test Setup

```typescript
// src/lib/auth/__tests__/pinService.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('../../db/database', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  exec: vi.fn(),
  transaction: vi.fn((fn) => fn()),
}));

import { validatePinFormat, setupPin, verifyPin } from '../pinService';
import * as authRepo from '../authRepository';

describe('PIN Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validatePinFormat', () => {
    it('should accept valid 4-digit PIN', () => {
      const result = validatePinFormat('1234');
      expect(result.valid).toBe(true);
    });

    it('should accept valid 6-digit PIN', () => {
      const result = validatePinFormat('123456');
      expect(result.valid).toBe(true);
    });

    it('should reject PIN with less than 4 digits', () => {
      const result = validatePinFormat('123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 4');
    });

    it('should reject PIN with more than 8 digits', () => {
      const result = validatePinFormat('123456789');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most 8');
    });

    it('should reject PIN with non-digits', () => {
      const result = validatePinFormat('12ab');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('only digits');
    });

    it('should reject PIN with all same digits', () => {
      const result = validatePinFormat('1111');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('same digit');
    });
  });

  describe('verifyPin', () => {
    it('should return error for non-existent user', async () => {
      vi.spyOn(authRepo, 'getLocalUserById').mockResolvedValue(null);

      const result = await verifyPin(999, '1234');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error when PIN not set up', async () => {
      vi.spyOn(authRepo, 'getLocalUserById').mockResolvedValue({
        id: 1,
        remote_user_id: 1,
        email: 'test@test.com',
        name: 'Test',
        pin_hash: null,
        pin_attempts: 0,
        pin_locked_until: null,
        biometric_enabled: 0,
        biometric_credential_id: null,
        distribution_center_id: null,
        permissions: null,
        role: null,
        avatar_url: null,
        last_login_at: null,
        profile_synced_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await verifyPin(1, '1234');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not set up');
    });
  });
});
```

---

## 16. Implementation Checklist

### Phase 1: Foundation
- [ ] Add environment variables
- [ ] Add type definitions (`src/lib/auth/types.ts`)
- [ ] Update database schema (`src/lib/db/schema.ts`)
- [ ] Add migration (`src/lib/db/migrations.ts`)
- [ ] Implement crypto service (`src/lib/auth/cryptoService.ts`)
- [ ] Implement auth repository (`src/lib/auth/authRepository.ts`)

### Phase 2: Core Services
- [ ] Implement device service (`src/lib/auth/deviceService.ts`)
- [ ] Implement PIN service (`src/lib/auth/pinService.ts`)
- [ ] Implement biometric service (`src/lib/auth/biometricService.ts`)
- [ ] Implement sync service (`src/lib/auth/syncService.ts`)
- [ ] Implement auth store (`src/lib/auth/authStore.ts`)
- [ ] Create auth index (`src/lib/auth/index.ts`)

### Phase 3: Components
- [ ] Create AuthGuard component
- [ ] Create PinInput component
- [ ] Update component exports

### Phase 4: Pages
- [ ] Create Activate page
- [ ] Create SetupPin page
- [ ] Create Login page
- [ ] Create Locked page

### Phase 5: Integration
- [ ] Update `src/lib/init.ts`
- [ ] Update `src/App.svelte`
- [ ] Update existing flows to use auth user

### Phase 6: Testing & Polish
- [ ] Write unit tests
- [ ] Test activation flow end-to-end
- [ ] Test offline scenarios
- [ ] Test PIN lockout
- [ ] Test biometric flow
- [ ] Test token refresh

---

## Files Summary

```
New files to create:
├── src/lib/auth/
│   ├── types.ts
│   ├── cryptoService.ts
│   ├── authRepository.ts
│   ├── deviceService.ts
│   ├── pinService.ts
│   ├── biometricService.ts
│   ├── syncService.ts
│   ├── authStore.ts
│   └── index.ts
├── src/lib/components/
│   ├── AuthGuard.svelte
│   └── PinInput.svelte
├── src/routes/auth/
│   ├── Activate.svelte
│   ├── SetupPin.svelte
│   ├── Login.svelte
│   └── Locked.svelte
└── src/lib/auth/__tests__/
    └── pinService.test.ts

Files to modify:
├── .env (add VITE_FLOWBIN_API_URL)
├── src/vite-env.d.ts (add env types)
├── src/lib/db/schema.ts (add auth tables)
├── src/lib/db/migrations.ts (add auth migration)
├── src/lib/components/index.ts (export new components)
├── src/lib/init.ts (add auth initialization)
└── src/App.svelte (add auth routes and guard)
```
