# Hybrid Authentication Implementation Plan

Integration between **local-flowbin** (PWA) and **flowbin** (Laravel) for authentication.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SYSTEM ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│   ┌──────────────┐         HTTPS          ┌──────────────────┐     │
│   │ local-flowbin│◄──────────────────────►│  flowbin         │     │
│   │    (PWA)     │  • Device activation   │  (Laravel)       │     │
│   │  SQLite WASM │  • Token refresh       │  MySQL/Postgres  │     │
│   └──────────────┘  • Profile sync        └──────────────────┘     │
│         │                                                           │
│         ▼                                                           │
│   ┌──────────────┐                                                  │
│   │  PIN / Bio   │  ◄── Daily login (no server required)           │
│   └──────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Never block local operations on server availability**
2. **Token expiry should be long (30-90 days) with graceful handling**
3. **Local PIN/biometric for daily auth** - fast for warehouse workers
4. **Deauthorization = soft lock** - warn user, allow data export, don't destroy local data

---

## Part 1: Laravel (flowbin) Side

### Database Schema

```sql
CREATE TABLE devices (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    device_name VARCHAR(255),
    device_token VARCHAR(500) NOT NULL,
    refresh_token VARCHAR(500) NOT NULL,
    token_expires_at TIMESTAMP NOT NULL,
    refresh_expires_at TIMESTAMP NOT NULL,
    last_seen_at TIMESTAMP,
    last_ip VARCHAR(45),
    status ENUM('active', 'suspended', 'revoked') DEFAULT 'active',
    distribution_center_id BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_device_token (device_token(64)),
    INDEX idx_status (status)
);

CREATE TABLE device_audit_log (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    device_id BIGINT UNSIGNED NOT NULL,
    event_type ENUM('activated', 'refreshed', 'validated', 'suspended', 'revoked'),
    ip_address VARCHAR(45),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);
```

### API Endpoints

```php
// routes/api.php
Route::prefix('device-auth')->group(function () {
    // Public
    Route::post('/activate', [DeviceAuthController::class, 'activate']);
    Route::post('/refresh', [DeviceAuthController::class, 'refresh']);

    // Authenticated (device token required)
    Route::middleware('device.auth')->group(function () {
        Route::get('/validate', [DeviceAuthController::class, 'validate']);
        Route::get('/profile', [DeviceAuthController::class, 'profile']);
        Route::post('/deactivate', [DeviceAuthController::class, 'deactivate']);
    });
});

// Admin device management
Route::prefix('admin/devices')->middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/', [DeviceManagementController::class, 'index']);
    Route::patch('/{device}/suspend', [DeviceManagementController::class, 'suspend']);
    Route::patch('/{device}/reactivate', [DeviceManagementController::class, 'reactivate']);
    Route::delete('/{device}', [DeviceManagementController::class, 'revoke']);
});
```

### Activation Endpoint

```php
// POST /api/device-auth/activate
// Request: { email, password, device_id, device_name }
// Response:
{
    "device_token": "64-char-hex-string",
    "refresh_token": "64-char-hex-string",
    "token_expires_at": "2025-02-15T00:00:00Z",
    "refresh_expires_at": "2025-04-15T00:00:00Z",
    "user": {
        "id": 1,
        "email": "worker@warehouse.com",
        "name": "John Doe",
        "role": "warehouse_operator"
    },
    "distribution_center": { "id": 1, "name": "Main Warehouse" },
    "permissions": ["receive", "release", "inventory_view"]
}
```

### Device Auth Middleware

```php
// app/Http/Middleware/DeviceAuthentication.php
class DeviceAuthentication
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->header('X-Device-Token');
        if (!$token) return response()->json(['error' => 'missing_device_token'], 401);

        $device = Device::where('device_token', hash('sha256', $token))->first();
        if (!$device) return response()->json(['error' => 'invalid_device_token'], 401);

        if ($device->status === 'revoked') {
            return response()->json(['error' => 'device_revoked'], 403);
        }
        if ($device->token_expires_at < now()) {
            return response()->json(['error' => 'token_expired'], 401);
        }

        $device->update(['last_seen_at' => now(), 'last_ip' => $request->ip()]);
        $request->device = $device;

        return $next($request);
    }
}
```

---

## Part 2: local-flowbin (PWA) Side

### Database Schema Additions

```sql
-- Device credentials (encrypted tokens)
CREATE TABLE IF NOT EXISTS device_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT UNIQUE NOT NULL,
    device_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TEXT,
    refresh_expires_at TEXT,
    activated_at TEXT,
    last_sync_at TEXT
);

-- Local users cache
CREATE TABLE IF NOT EXISTS local_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remote_user_id INTEGER UNIQUE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT,
    pin_hash TEXT,
    pin_attempts INTEGER DEFAULT 0,
    pin_locked_until TEXT,
    biometric_enabled INTEGER DEFAULT 0,
    biometric_credential_id TEXT,
    distribution_center_id INTEGER,
    permissions TEXT,
    last_login_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Auth sessions (audit trail)
CREATE TABLE IF NOT EXISTS auth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    auth_method TEXT NOT NULL,
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    ended_at TEXT,
    FOREIGN KEY (user_id) REFERENCES local_users(id)
);
```

### Project Structure

```
src/lib/auth/
├── authService.ts          # Core auth initialization
├── authStore.ts            # Svelte store for auth state
├── deviceService.ts        # Device activation & tokens
├── pinService.ts           # PIN hashing & validation
├── biometricService.ts     # WebAuthn integration
├── cryptoService.ts        # Token encryption (AES-GCM)
├── syncService.ts          # Background sync
└── authRepository.ts       # Database operations

src/routes/auth/
├── Activate.svelte         # Device activation flow
├── SetupPin.svelte         # PIN setup after activation
├── Login.svelte            # Daily PIN/biometric login
└── Locked.svelte           # Device revoked/suspended
```

### Auth Store

```typescript
// src/lib/auth/authStore.ts
export type AuthStatus =
    | 'initializing'
    | 'not_activated'
    | 'activation_required'
    | 'login_required'
    | 'authenticated'
    | 'suspended'
    | 'revoked';

interface AuthStoreState {
    status: AuthStatus;
    currentUser: LocalUser | null;
    deviceCredentials: DeviceCredentials | null;
    lastSyncAt: Date | null;
    isOnline: boolean;
    syncError: string | null;
}
```

### Crypto Service (Token Encryption)

```typescript
// src/lib/auth/cryptoService.ts
// Uses Web Crypto API with AES-GCM-256

export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(plaintext)
    );
    // Combine IV + ciphertext, return as base64
}

export async function decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    // Extract IV, decrypt, return plaintext
}
```

### Device Service

```typescript
// src/lib/auth/deviceService.ts
const API_BASE = import.meta.env.VITE_FLOWBIN_API_URL;

export async function activateDevice(email: string, password: string, deviceName?: string) {
    const deviceId = getOrCreateDeviceId(); // UUID in localStorage

    const response = await fetch(`${API_BASE}/device-auth/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, device_id: deviceId, device_name: deviceName }),
    });

    if (!response.ok) return { success: false, error: 'Activation failed' };

    const data = await response.json();

    // Encrypt tokens before storage
    const key = await generateEncryptionKey();
    localStorage.setItem('flowbin_encryption_key', await exportKey(key));

    await authRepo.saveDeviceCredentials({
        device_id: deviceId,
        device_token_encrypted: await encrypt(data.device_token, key),
        refresh_token_encrypted: await encrypt(data.refresh_token, key),
        token_expires_at: data.token_expires_at,
        refresh_expires_at: data.refresh_expires_at,
    });

    await authRepo.saveLocalUser({ ...data.user, permissions: JSON.stringify(data.permissions) });

    return { success: true, user: data.user };
}

export async function refreshTokens(): Promise<boolean> {
    // Decrypt current tokens, call refresh endpoint, encrypt and store new tokens
}

export async function validateAndSync(): Promise<boolean> {
    // Validate device with server, update local user profile
}
```

### PIN Service

```typescript
// src/lib/auth/pinService.ts
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function setupPin(userId: number, pin: string): Promise<boolean> {
    const salt = generateSalt();
    const pinHash = await hashPin(pin, salt); // SHA-256
    await authRepo.updateUserPin(userId, `${salt}:${pinHash}`);
    return true;
}

export async function verifyPin(userId: number, pin: string): Promise<Result> {
    const user = await authRepo.getLocalUserById(userId);

    // Check lockout
    if (user.pin_locked_until && new Date(user.pin_locked_until) > new Date()) {
        return { success: false, error: 'Account locked', lockedUntil };
    }

    // Verify hash
    const [salt, storedHash] = user.pin_hash.split(':');
    if (await hashPin(pin, salt) !== storedHash) {
        // Increment attempts, possibly lock
        return { success: false, error: 'Incorrect PIN', attemptsRemaining };
    }

    // Success - create session
    const sessionId = await authRepo.createAuthSession(userId, 'pin');
    authStore.setUser(user);
    authStore.setStatus('authenticated');
    return { success: true, sessionId };
}
```

### Biometric Service

```typescript
// src/lib/auth/biometricService.ts
// Uses WebAuthn API

export async function isBiometricAvailable(): Promise<boolean> {
    return window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable() ?? false;
}

export async function registerBiometric(userId: number): Promise<boolean> {
    const credential = await navigator.credentials.create({ publicKey: { ... } });
    await authRepo.updateBiometricCredential(userId, credential.rawId);
    return true;
}

export async function authenticateWithBiometric(userId: number): Promise<Result> {
    const assertion = await navigator.credentials.get({ publicKey: { ... } });
    // Create session on success
}
```

### Background Sync Service

```typescript
// src/lib/auth/syncService.ts
const SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

export function startBackgroundSync(): void {
    performSync(); // Initial sync
    setInterval(performSync, SYNC_INTERVAL_MS);
    window.addEventListener('online', performSync);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') performSync();
    });
}

async function performSync(): Promise<void> {
    if (!navigator.onLine) return;

    // Refresh tokens if near expiry (within 7 days)
    // Validate device and sync user profile
}
```

---

## Part 3: UI Flows

### Flow Diagram

```
FIRST LAUNCH                          DAILY USE
─────────────                         ─────────
[Splash]                              [Splash]
    │                                     │
    ▼                                     ▼
[Activate Device]                     [PIN/Biometric]
    │ email/password                      │
    ▼                                     ▼
[Set PIN]                             [Dashboard]
    │
    ▼
[Enable Biometric?]
    │
    ▼
[Dashboard]


TOKEN EXPIRED (online)                DEVICE REVOKED
──────────────────────                ──────────────
[Any Screen]                          [Any Screen]
    │                                     │
    ▼                                     ▼
[Background refresh]                  [Locked Screen]
    │                                     │
    ▼                                     ▼
[Continue normally]                   [Export Data Option]
```

### Key Components

**AuthGuard.svelte** - Wraps protected routes, redirects based on auth status

**PinInput.svelte** - 4-6 digit PIN entry with large touch targets

**Activate.svelte** - Email/password form to activate device with flowbin

**Login.svelte** - PIN entry with optional biometric button

---

## Part 4: Integration

### App Initialization

```typescript
// src/lib/init.ts
export async function initializeApp(): Promise<void> {
    await initializeDatabase();
    await runMigrations(); // Include auth tables
    await initializeAuth(); // Check credentials, set auth status
    startBackgroundSync();
    await hydrateStores();
}
```

### Router Protection

```typescript
// src/routes.ts
export const routes = {
    // Public auth routes
    '/auth/activate': Activate,
    '/auth/login': Login,
    '/auth/locked': Locked,

    // Protected routes
    '/': wrap({ component: Dashboard, conditions: [isAuthenticated] }),
    '/receive': wrap({ component: Receive, conditions: [isAuthenticated] }),
    '/release': wrap({ component: Release, conditions: [isAuthenticated] }),
};
```

### Tag Transactions with User

```typescript
// In receive/release services
const user = get(currentUser);
const transaction = {
    ...data,
    user_id: user?.remote_user_id,
    user_name: user?.name,
};
```

---

## Part 5: Security

| Concern | Mitigation |
|---------|------------|
| Token storage | AES-GCM encrypted before SQLite storage |
| Encryption key | localStorage (acceptable for PWA) |
| PIN brute force | 5 attempts → 15-minute lockout |
| Token theft | 30-day expiry + refresh mechanism |
| Revocation delay | Sync every 4 hours + on app open |
| Offline access | Local PIN/biometric always required |
| Transport | HTTPS only |

---

## Part 6: Implementation Phases

### Phase 1: Foundation
- Database schema additions
- cryptoService implementation
- authRepository basics
- authStore setup

### Phase 2: Device Activation
- Laravel API endpoints
- deviceService implementation
- Activation UI flow

### Phase 3: Local Auth
- PIN service with lockout
- Biometric service (WebAuthn)
- Login UI flow
- AuthGuard component

### Phase 4: Background Sync
- Sync service scheduler
- Token refresh logic
- Profile sync
- Error handling & offline scenarios

### Phase 5: Polish
- Settings UI (PIN change, biometric toggle)
- Laravel admin device management
- Edge case testing
- Documentation

---

## Environment Variables

```bash
# local-flowbin .env
VITE_FLOWBIN_API_URL=https://flowbin.example.com/api
```

---

## Summary

This hybrid approach provides:

- **Server-side control** via flowbin (user management, device revocation)
- **Offline-first operation** with local PIN/biometric auth
- **Audit trail** with user IDs on all transactions
- **Graceful degradation** when server unreachable
- **Security** through encrypted storage and PIN lockout

The key principle: **warehouse operations never blocked by server availability**.
