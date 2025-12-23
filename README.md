# FlowBin

A mobile-first, offline-capable warehouse inventory management application for receiving and releasing inventory. Built with Svelte 5, Capacitor SQLite, and designed to work reliably in environments with poor network connectivity.

**Platforms**: Web (PWA) | Android (Capacitor)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Database Layer](#database-layer)
- [Authentication System](#authentication-system)
- [Business Logic](#business-logic)
- [State Management](#state-management)
- [Testing](#testing)
- [Development Commands](#development-commands)
- [Android Build](#android-build)
- [Deployment](#deployment)
- [Key Design Decisions](#key-design-decisions)
- [Related Documentation](#related-documentation)

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | Svelte 5 | Runes disabled for router compatibility |
| **Build** | Vite 7 + Bun | Fast bundling, ES modules |
| **Router** | svelte-spa-router 4 | Hash-based SPA routing (`/#/path`) |
| **Database** | Capacitor SQLite | jeep-sqlite (web) / native (Android) |
| **Mobile** | Capacitor 8 | Native bridge for Android |
| **Testing** | Vitest + jsdom | DB mocking required |
| **Type Safety** | TypeScript 5 | Strict mode enabled |
| **Auth Crypto** | Web Crypto API | AES-GCM-256, PBKDF2 (100k iterations) |

---

## Project Structure

```
local-flowbin/
├── public/
│   └── assets/
│       └── sql-wasm.wasm          # WebAssembly SQLite for web platform
│
├── src/
│   ├── main.ts                    # App entry point
│   ├── App.svelte                 # Root component with Router
│   ├── app.css                    # Global styles (dark theme)
│   │
│   ├── routes/                    # Page components
│   │   ├── Home.svelte            # Operation selection (Receive/Release)
│   │   ├── auth/
│   │   │   ├── Activate.svelte    # Device activation form
│   │   │   ├── SetupPin.svelte    # PIN setup (first time)
│   │   │   ├── Login.svelte       # PIN login + biometric
│   │   │   └── Locked.svelte      # Device suspended/revoked
│   │   ├── receive/
│   │   │   ├── Step1.svelte       # Select product, quantity, position
│   │   │   └── Step2.svelte       # Confirm and complete
│   │   └── release/
│   │       ├── Step1.svelte       # Select product
│   │       ├── Step2.svelte       # Select source batch (FIFO)
│   │       └── Step3.svelte       # Confirm destination
│   │
│   └── lib/                       # Core application library
│       ├── init.ts                # App initialization orchestrator
│       │
│       ├── auth/                  # Authentication system
│       │   ├── index.ts           # Public API exports
│       │   ├── authStore.ts       # Auth state + inactivity timer
│       │   ├── authRepository.ts  # DB access for credentials
│       │   ├── deviceService.ts   # Device activation, tokens
│       │   ├── pinService.ts      # PIN verification, lockout
│       │   ├── biometricService.ts# WebAuthn biometric auth
│       │   ├── cryptoService.ts   # AES-256 encryption, PBKDF2
│       │   ├── syncService.ts     # Background token validation
│       │   └── types.ts           # Auth types & constants
│       │
│       ├── db/                    # Database layer
│       │   ├── database.ts        # Capacitor SQLite wrapper
│       │   ├── schema.ts          # Table definitions
│       │   └── migrations.ts      # Schema versioning (v5)
│       │
│       ├── repositories/          # Data access layer
│       │   ├── productRepo.ts     # Product queries
│       │   ├── positionRepo.ts    # Storage position queries
│       │   ├── batchRepo.ts       # Inventory batch queries
│       │   ├── transactionRepo.ts # Transaction CRUD + sync status
│       │   └── settingsRepo.ts    # App settings
│       │
│       ├── services/              # Business logic layer
│       │   ├── receiveService.ts  # Receive inventory logic
│       │   ├── releaseService.ts  # Release inventory logic
│       │   ├── dataSyncService.ts # Bidirectional server sync
│       │   ├── transactionHelper.ts # Sync upload helper
│       │   └── __tests__/         # Service tests
│       │
│       ├── stores/                # Svelte stores
│       │   ├── receiveFlow.ts     # Receive wizard state
│       │   ├── releaseFlow.ts     # Release wizard state
│       │   ├── distributionCenter.ts # Selected DC
│       │   └── ui.ts              # Toast notifications
│       │
│       ├── components/            # Reusable UI components
│       │   ├── Header.svelte      # App header with sync status
│       │   ├── AuthGuard.svelte   # Auth route protection
│       │   ├── SearchDropdown.svelte # Searchable selector
│       │   ├── QuantityInput.svelte
│       │   ├── PositionSelector.svelte
│       │   ├── PinInput.svelte
│       │   └── ...
│       │
│       ├── types/                 # TypeScript definitions
│       │   └── index.ts           # All entity types
│       │
│       └── utils/                 # Utilities
│           ├── date.ts            # Date formatting
│           ├── api.ts             # API error parsing
│           └── error.ts           # Error handling
│
├── android/                       # Capacitor Android project
│   ├── app/
│   │   └── build.gradle
│   └── ...
│
├── capacitor.config.ts            # Capacitor configuration
├── vite.config.ts                 # Vite build config
├── svelte.config.js               # Svelte config (runes: false)
├── tsconfig.json                  # TypeScript config
├── vitest.config.ts               # Test config
└── package.json
```

---

## Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ROUTES                                  │
│              src/routes/*.svelte                                │
│         Page components, user flows, navigation                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         STORES                                  │
│              src/lib/stores/*.ts                                │
│      Svelte stores for flow state (receiveFlow, releaseFlow)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVICES                                 │
│              src/lib/services/*.ts                              │
│         Business logic, validation, orchestration               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      REPOSITORIES                               │
│              src/lib/repositories/*.ts                          │
│           Data access, SQL queries, entity CRUD                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                 │
│              src/lib/db/database.ts                             │
│      Capacitor SQLite wrapper (web/Android abstraction)         │
└─────────────────────────────────────────────────────────────────┘
```

### Initialization Flow

```typescript
// src/lib/init.ts
async function initApp() {
  await initDatabase();        // 1. Platform-specific SQLite setup
  await initializeSchema();    // 2. Run migrations, ensure tables
  await initDeviceAuth();      // 3. Load device credentials, set auth status
  await initDistributionCenter(); // 4. Load selected DC
}
```

### Platform-Specific Handling

**Web (jeep-sqlite)**:
- Uses sql.js compiled to WebAssembly
- WASM files loaded from `/public/assets/sql-wasm.wasm`
- Persists to IndexedDB via `saveToStore()` after transactions
- Transactions handled internally by sql.js

**Android (Native SQLite)**:
- Uses Capacitor SQLite plugin with native implementation
- Explicit transaction control: `beginTransaction()`, `commitTransaction()`, `rollbackTransaction()`
- `inTransaction` flag prevents nested transaction conflicts:

```typescript
// database.ts pattern
let inTransaction = false;

export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (platform === 'web') {
    const result = await fn();
    await saveToStore();
    return result;
  }

  // Android: explicit transaction control
  inTransaction = true;
  await beginTransaction();
  try {
    const result = await fn();
    await commitTransaction();
    return result;
  } catch (error) {
    await rollbackTransaction();
    throw error;
  } finally {
    inTransaction = false;
  }
}
```

---

## Database Layer

### Core Entities

| Entity | Table | Purpose |
|--------|-------|---------|
| **DistributionCenter** | `distribution_centers` | Warehouse facilities |
| **Product** | `products` | Trackable SKUs (sku, name, category, color, size) |
| **StoragePosition** | `storage_positions` | Physical locations (zone/aisle/rack/level) |
| **InventoryBatch** | `inventory_batches` | Stock units at positions (batch_number, quantity) |
| **Transaction** | `transactions` | Movement audit trail (RECEIVE, RELEASE, ADJUST) |
| **DeviceCredentials** | `device_credentials` | Encrypted auth tokens |
| **AuthUser** | `users` | User profiles with PIN hash |
| **AuthSession** | `auth_sessions` | Login audit trail |

### Schema Version

Current version: **v5**

Migration history:
- v1→v2: Added `color`, `size` to products
- v2→v3: Added auth tables (`device_credentials`, `auth_sessions`, user auth fields)
- v3→v4: Added sync tracking (`sync_status`, `synced_at`, `sync_error`)
- v4→v5: Added `is_active` to inventory_batches (soft delete support)

### Query Patterns

**Parameterized Queries** (SQL injection prevention):
```typescript
// repositories use ? placeholders
const product = await queryOne<Product>(
  'SELECT * FROM products WHERE id = ? AND is_active = 1',
  [productId]
);
```

**Soft Delete Pattern** (preserves FK relationships):
```typescript
// Instead of DELETE, set is_active = 0
await exec(
  'UPDATE products SET is_active = 0 WHERE distribution_center_id = ?',
  [dcId]
);

// Queries filter by is_active
const products = await query<Product>(
  'SELECT * FROM products WHERE distribution_center_id = ? AND is_active = 1',
  [dcId]
);
```

**Upsert Pattern** (for sync operations):
```typescript
await exec(`
  INSERT INTO products (id, sku, name, distribution_center_id, is_active)
  VALUES (?, ?, ?, ?, 1)
  ON CONFLICT(id) DO UPDATE SET
    sku = excluded.sku,
    name = excluded.name,
    is_active = 1
`, [id, sku, name, dcId]);
```

### Transaction Handling

All multi-step operations use the `transaction()` wrapper:

```typescript
// receiveService.ts
export async function executeReceive(input: ReceiveInput) {
  return transaction(async () => {
    // Step 1: Create inventory batch
    const batch = await createBatch({
      productId: input.productId,
      positionId: input.positionId,
      quantity: input.quantity,
      // ...
    });

    // Step 2: Create transaction record
    const txn = await createTransaction({
      type: 'RECEIVE',
      productId: input.productId,
      batchId: batch.id,
      // ...
    });

    return { batch, transaction: txn };
  });
}
```

---

## Authentication System

### Auth Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Device          │     │ PIN             │     │ Login           │
│ Activation      │────▶│ Setup           │────▶│ (PIN/Biometric) │
│ (email/pass)    │     │ (4-6 digits)    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   Server issues          Key derived            Key re-derived
   encrypted tokens       from PIN               Tokens decrypted
                         Tokens encrypted        Session created
```

### Auth State Machine

```
                    ┌──────────────┐
                    │ initializing │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
     ┌────────────────┐        ┌────────────────┐
     │ not_activated  │        │ login_required │
     └────────┬───────┘        └────────┬───────┘
              │                         │
              ▼                         ▼
     ┌────────────────┐        ┌────────────────┐
     │ activation_    │        │ authenticated  │
     │ required       │        └────────────────┘
     └────────┬───────┘
              │
     ┌────────┴────────┐
     ▼                 ▼
┌──────────┐    ┌──────────┐
│suspended │    │ revoked  │
└──────────┘    └──────────┘
```

### Security Architecture

**PIN Security**:
- 4-6 digits, no patterns (1234, 5555 rejected)
- PBKDF2 hash with 100,000 iterations
- Random 128-bit salt per user
- Timing-safe comparison
- 5-attempt lockout (15 minutes)

**Token Encryption**:
- AES-GCM-256 with random 96-bit IV
- Encryption key derived from PIN via PBKDF2
- Key exists **only in memory** during authenticated session
- Cleared on logout or inactivity timeout (30 min default)

```typescript
// Encryption flow (cryptoService.ts)
const key = await deriveKeyFromPin(pin, salt);  // PBKDF2
setEncryptionKey(key);                           // Store in memory
const encrypted = await encrypt(token);          // AES-GCM-256
// Key never persisted to storage
```

### Biometric Authentication

- Uses WebAuthn API with platform authenticator
- **Requires PIN login first** (encryption key must be in memory)
- Not suitable for cold start (app completely closed)
- Used for quick re-authentication after timeout

```typescript
// biometricService.ts
export async function authenticateWithBiometric(userId: string) {
  if (!hasEncryptionKey()) {
    return { success: false, error: 'PIN login required first' };
  }
  // WebAuthn assertion with stored credential
  const credential = await navigator.credentials.get({ publicKey: options });
  return createAuthSession(userId, 'biometric');
}
```

### Inactivity Timeout

```typescript
// authStore.ts
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Monitors: mousedown, keydown, touchstart, scroll
// Resets timer on activity when authenticated
// Auto-logout when timer expires
```

---

## Business Logic

### Receive Service

**Location**: `src/lib/services/receiveService.ts`

**Batch Number Generation**:
```typescript
// Format: BATCH-YYYYMMDD-NNN
const batchNumber = await generateBatchNumber(distributionCenterId);
// Example: BATCH-20251218-001, BATCH-20251218-002
```

**Receive Flow**:
1. Validate inputs (product exists, position exists, quantity > 0)
2. Generate unique batch number
3. Create `InventoryBatch` record
4. Create `RECEIVE` transaction with `sync_status = 'pending'`
5. Attempt immediate sync upload (non-blocking)

### Release Service

**Location**: `src/lib/services/releaseService.ts`

**Key Constraint**: Full batch release only (no partial releases)

**Release Flow**:
1. Validate batch has available quantity
2. Resolve destination position (auto-creates "Shipping" zone if needed)
3. Update batch quantity to 0
4. Create `RELEASE` transaction
5. Attempt immediate sync upload

**FIFO Support**:
```typescript
// Batches sorted by received_at ASC (oldest first)
const batches = await listBatchesWithDetails(productId);
// UI auto-selects oldest batch for picking
```

### Data Sync Service

**Location**: `src/lib/services/dataSyncService.ts`

**Sync Architecture**:
```
┌──────────────────┐                    ┌──────────────────┐
│      Local       │                    │      Server      │
│                  │                    │                  │
│ transactions     │ ──── Upload ────▶  │ /api/sync/txns   │
│ (pending)        │                    │                  │
│                  │                    │                  │
│ products         │ ◀── Download ────  │ /api/sync        │
│ positions        │                    │                  │
│ batches          │                    │                  │
└──────────────────┘                    └──────────────────┘
```

**Sync Status Lifecycle**:
```
Transaction Created
        │
        ▼
   sync_status = 'pending'
        │
        ├──── Immediate upload succeeds ────▶ 'synced'
        │
        └──── Fails/offline ────▶ Queued for batch upload
                                        │
                                        ├──▶ 'synced'
                                        └──▶ 'rejected' (with sync_error)
```

**Optimistic Sync**:
```typescript
// transactionHelper.ts
export async function recordTransactionWithUpload(transactionId: string) {
  authStore.incrementPendingTransactionCount();

  // Non-blocking upload attempt
  const uploaded = await tryImmediateUpload(transactionId);
  if (uploaded) {
    authStore.decrementPendingTransactionCount();
  }
  // If offline, stays in queue for later batch upload
}
```

---

## State Management

### Svelte Stores

| Store | Location | Purpose |
|-------|----------|---------|
| `authStore` | `src/lib/auth/authStore.ts` | Auth state, user, sync status, inactivity timer |
| `receiveFlow` | `src/lib/stores/receiveFlow.ts` | 2-step receive wizard state |
| `releaseFlow` | `src/lib/stores/releaseFlow.ts` | 3-step release wizard state |
| `selectedDc` | `src/lib/stores/distributionCenter.ts` | Selected distribution center |
| `toasts` | `src/lib/stores/ui.ts` | Toast notifications |

### Receive Flow Store

```typescript
// receiveFlow.ts
interface ReceiveFlowState {
  product: Product | null;
  quantity: number;           // Default: 1
  position: StoragePosition | null;
  batchNumber: string | null; // Generated on confirm screen
}

// Validation helper
export function canConfirmReceive(state: ReceiveFlowState): boolean {
  return state.product !== null
      && state.position !== null
      && state.quantity > 0;
}
```

### Release Flow Store

```typescript
// releaseFlow.ts
interface ReleaseFlowState {
  product: Product | null;
  sourceBatch: InventoryBatch | null;
  sourcePosition: StoragePosition | null;
  destinationPosition: StoragePosition | null;
}

// Step validation helpers
export function canSelectSource(s): boolean { return s.product !== null; }
export function canSelectDestination(s): boolean {
  return s.sourceBatch !== null && s.sourcePosition !== null;
}
export function canConfirmRelease(s): boolean {
  return s.product && s.sourceBatch && s.sourcePosition && s.destinationPosition;
}
```

### Auth Store Derived Stores

```typescript
// authStore.ts exports these derived stores
export const isAuthenticated = derived(authStore, $s => $s.status === 'authenticated');
export const currentUser = derived(authStore, $s => $s.currentUser);
export const needsLogin = derived(authStore, $s => $s.status === 'login_required');
export const requiresActivation = derived(authStore, $s =>
  ['not_activated', 'activation_required'].includes($s.status)
);
export const hasPendingTransactions = derived(authStore, $s =>
  $s.pendingTransactionCount > 0
);
export const isDataSyncing = derived(authStore, $s => $s.isDataSyncing);
```

---

## Testing

### Test Setup

Capacitor SQLite cannot run in Node.js, so the database module must be mocked:

```typescript
// src/lib/services/__tests__/receiveService.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../db/database', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  exec: vi.fn(),
  transaction: vi.fn((fn) => fn()), // Execute callback immediately
}));

vi.mock('../../repositories/productRepo', () => ({
  getProductById: vi.fn(),
}));

// ... rest of test setup
```

### Running Tests

```bash
# Run all tests
bun run test

# Run specific test file
bun run test -- src/lib/services/__tests__/receiveService.test.ts

# Watch mode
bun run test:watch

# Coverage report
bun run test:coverage
```

### Test Patterns

**Service Layer Tests**:
```typescript
describe('executeReceive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create batch and transaction atomically', async () => {
    // Arrange
    vi.mocked(getProductById).mockResolvedValue(mockProduct);
    vi.mocked(getPositionById).mockResolvedValue(mockPosition);
    vi.mocked(createBatch).mockResolvedValue(mockBatch);
    vi.mocked(createTransaction).mockResolvedValue(mockTransaction);

    // Act
    const result = await executeReceive(validInput);

    // Assert
    expect(result.success).toBe(true);
    expect(createBatch).toHaveBeenCalledWith(expect.objectContaining({
      productId: validInput.productId,
      quantity: validInput.quantity,
    }));
  });

  it('should fail if product not found', async () => {
    vi.mocked(getProductById).mockResolvedValue(null);

    const result = await executeReceive(validInput);

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Product not found');
  });
});
```

---

## Development Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run dev` | Start dev server (localhost:5173) |
| `bun run build` | Production build to `dist/` |
| `bun run check` | TypeScript type checking |
| `bun run test` | Run all tests |
| `bun run test:watch` | Run tests in watch mode |
| `bun run test:coverage` | Run tests with coverage |
| `bun run android:build` | Build web + sync to Android |
| `bun run cap:sync` | Sync web assets to Android |
| `bun run cap:open` | Open Android Studio |

---

## Android Build

### Prerequisites

1. **Java 17** (OpenJDK):
   ```bash
   brew install openjdk@17
   export JAVA_HOME=/opt/homebrew/opt/openjdk@17
   ```

2. **Android Studio**: Download from https://developer.android.com/studio

3. **Environment Variables**:
   ```bash
   export ANDROID_SDK_ROOT=~/Library/Android/sdk
   ```

### Build Commands

```bash
# Build web and sync to Android
bun run android:build

# Or manually:
bun run build
bun run cap:sync

# Build APK via Gradle
cd android && ./gradlew assembleDebug

# Or open in Android Studio
bun run cap:open
```

### APK Location

```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Capacitor Configuration

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.flowbin.app',
  appName: 'FlowBin',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};
```

---

## Deployment

### Web Deployment (Vercel/Static)

1. Build the application:
   ```bash
   bun run build
   ```

2. Deploy the `dist/` directory to your static host

3. Configure SPA routing (redirect all paths to `index.html`):
   ```json
   // vercel.json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FLOWBIN_API_URL` | No | Backend API URL for sync |

The app works fully offline without an API URL configured.

---

## Key Design Decisions

### Svelte 5 Runes Disabled

```javascript
// svelte.config.js
export default {
  compilerOptions: {
    runes: false  // Required for svelte-spa-router compatibility
  }
};
```

### Full Batch Release Only

Releases must release the entire batch quantity. This simplifies inventory tracking and prevents partial batch fragmentation.

### Soft Deletes for Data Integrity

Products and positions use `is_active = 0` instead of `DELETE`. This preserves foreign key relationships with historical transactions for audit trail integrity.

### In-Memory Encryption Key

The encryption key derived from the user's PIN is stored only in memory, never persisted. This provides strong security but requires PIN re-entry after app restart.

### Offline-First with Optimistic Sync

All operations work offline. Transactions are created locally with `sync_status = 'pending'` and uploaded when connectivity is available. Failed uploads are retried automatically.

### FIFO Inventory Picking

Batch queries are sorted by `received_at ASC` to support First-In-First-Out picking. The UI highlights and auto-selects the oldest available batch.

---

## Related Documentation

| Document | Description |
|----------|-------------|
| `CLAUDE.md` | AI coding guidelines and project conventions |
| `PRD.md` | Comprehensive product requirements document |

---


bun run android:build
bun run cap:sync
bunx cap run android
cd android && ./gradlew assembleDebug