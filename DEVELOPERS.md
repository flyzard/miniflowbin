# FlowBin Developer's Guide

A comprehensive guide for developers working on the FlowBin warehouse inventory management PWA.

---

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run tests
bun run test

# Build for production
bun run build

# Deploy to Vercel
npx vercel --prod
```

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Svelte 5 |
| Build Tool | Vite 7 |
| Language | TypeScript |
| Router | svelte-spa-router |
| Database | SQLite WASM (OPFS/IndexedDB) |
| PWA | vite-plugin-pwa + Workbox |
| Testing | Vitest + Testing Library |

---

## Project Structure

```
src/
├── lib/
│   ├── components/      # Reusable UI components
│   ├── db/              # SQLite database layer
│   │   ├── database.ts  # DB initialization & queries
│   │   ├── schema.ts    # Table definitions
│   │   └── migrations.ts# Schema versioning & seed data
│   ├── repositories/    # Data access layer
│   ├── services/        # Business logic
│   ├── stores/          # Svelte state management
│   └── types/           # TypeScript interfaces
├── routes/
│   ├── receive/         # Receive inventory wizard
│   └── release/         # Release inventory wizard
├── App.svelte           # Root component + router
├── app.css              # Global styles & CSS variables
└── main.ts              # Entry point
```

---

## Architecture

### Layered Pattern

```
UI Components (routes/, components/)
        ↓
Svelte Stores (stores/)
        ↓
Services (services/)
        ↓
Repositories (repositories/)
        ↓
Database (db/)
```

### Data Flow

1. **Components** dispatch events and read from stores
2. **Stores** manage UI state and trigger services
3. **Services** validate input and coordinate business logic
4. **Repositories** execute SQL queries
5. **Database** persists data locally via SQLite WASM

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `distribution_centers` | Warehouse facilities |
| `users` | Warehouse personnel |
| `products` | SKUs and items |
| `storage_positions` | Physical locations (zone/aisle/rack/level) |
| `inventory_batches` | Quantity at position with batch tracking |
| `transactions` | Audit trail (RECEIVE/RELEASE/ADJUST) |
| `app_settings` | Key-value config storage |

### Key Relationships

- Products and positions scoped to distribution center
- Batches link product → position with quantity
- Transactions reference batch, user, positions

### Adding Schema Changes

1. Modify `CREATE_TABLES_SQL` in `src/lib/db/schema.ts`
2. Increment `SCHEMA_VERSION`
3. Migration runs automatically on next app init

---

## Key Services

### receiveService

Handles receiving inventory into warehouse.

```typescript
// Validate input
const validation = validateReceive({
  productId, positionId, quantity, userId, distributionCenterId
});

// Execute (creates batch + transaction)
const result = await executeReceive(input);
```

### releaseService

Handles releasing inventory from warehouse.

```typescript
// Two modes: FULL_BATCH or SPECIFIC_QUANTITY
const result = await executeRelease({
  batchId, quantity, destinationPositionId,
  userId, distributionCenterId, releaseMode
});
```

### inventoryService

Read-only inventory queries.

```typescript
getBatchesForProduct(productId)     // FIFO ordered
getProductsWithInventory(dcId)      // Products with qty > 0
searchAvailableProducts(term, dcId) // Searchable
```

---

## Stores

| Store | Purpose |
|-------|---------|
| `auth` | Current user state |
| `distributionCenter` | Selected DC |
| `receiveFlow` | Receive wizard state |
| `releaseFlow` | Release wizard state |
| `ui` | Loading state, toasts |

### Using Stores

```svelte
<script>
  import { receiveProduct, canConfirmReceive } from '$lib/stores/receiveFlow';

  $: product = $receiveProduct;
  $: canProceed = $canConfirmReceive;
</script>
```

---

## Components

All exported from `src/lib/components/index.ts`:

| Component | Purpose |
|-----------|---------|
| `SearchDropdown` | Filterable select input |
| `QuantityInput` | Number input with +/- buttons |
| `PositionCard` | Batch info card (touchable) |
| `Button` | Primary/secondary buttons |
| `StepIndicator` | Wizard progress |
| `Toast` | Notification system |
| `LoadingSpinner` | Loading indicator |

### Component Events

```svelte
<SearchDropdown
  items={products}
  on:change={e => handleSelect(e.detail)}
/>
```

---

## Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Home.svelte | Main menu |
| `/receive` | receive/Step1.svelte | Select product, qty, position |
| `/receive/confirm` | receive/Step2.svelte | Confirm receipt |
| `/release` | release/Step1.svelte | Select product, mode |
| `/release/source` | release/Step2.svelte | Select batch (FIFO) |
| `/release/destination` | release/Step3.svelte | Select destination |
| `/release/confirm` | release/Step4.svelte | Confirm release |

---

## Testing

```bash
bun run test           # Run once
bun run test:watch     # Watch mode
bun run test:coverage  # With coverage
```

### Test Structure

```typescript
// Mock database and repositories
vi.mock('../../db/database', () => ({
  query: vi.fn(),
  exec: vi.fn(),
  // ...
}));

// Test service validation
describe('validateReceive', () => {
  it('should fail for inactive product', () => {
    vi.mocked(getProductById).mockReturnValue({ is_active: false });
    const result = validateReceive(input);
    expect(result.valid).toBe(false);
  });
});
```

---

## PWA & Offline

### How It Works

1. **Service Worker** caches app shell and WASM files
2. **SQLite WASM** stores data in OPFS (or IndexedDB fallback)
3. App works completely offline after first load

### Required Headers (Vercel)

`vercel.json`:
```json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [
      { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
      { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
    ]
  }]
}
```

---

## Adding Features

### New Feature Checklist

1. **Types** - Add interfaces in `src/lib/types/index.ts`
2. **Repository** - Add data access in `src/lib/repositories/`
3. **Service** - Add business logic in `src/lib/services/`
4. **Store** - Add state management if needed
5. **Component** - Create UI component
6. **Route** - Add route in `App.svelte`
7. **Tests** - Add tests in `__tests__/` folders

### Example: Adding a New Entity

```typescript
// 1. types/index.ts
export interface Supplier {
  id: string;
  name: string;
  // ...
}

// 2. repositories/supplierRepo.ts
export function getSupplierById(id: string): Supplier | null {
  return queryOne('SELECT * FROM suppliers WHERE id = ?', [id]);
}

// 3. services/supplierService.ts
export function validateSupplier(input: SupplierInput): ValidationResult {
  // validation logic
}
```

---

## Debugging

### Database Inspection

```javascript
// Browser console
import { query } from './lib/db/database';
query('SELECT * FROM products LIMIT 5');
```

### Store Debugging

```javascript
import { receiveFlowState } from './lib/stores/receiveFlow';
receiveFlowState.subscribe(console.log);
```

### PWA Issues

- DevTools → Application → Service Workers
- DevTools → Application → Storage → File System (OPFS)
- Clear site data to reset

---

## Deployment

### Vercel (Recommended)

```bash
bun run build
npx vercel --prod
```

### Manual

1. Run `bun run build`
2. Deploy `dist/` folder to any static host
3. Ensure COOP/COEP headers are set
4. HTTPS required for PWA features

---

## Design Guidelines

- **Dark theme** optimized for warehouse lighting
- **Touch-friendly** - minimum 44x44px touch targets
- **Mobile-first** - single column layouts
- **FIFO visual** - oldest batches highlighted first

### CSS Variables

```css
--color-bg-primary      /* Main background */
--color-accent-primary  /* Primary button */
--space-md              /* Standard spacing */
--radius-card           /* Card corners */
```

---

## Key Concepts

### FIFO (First In, First Out)

Batches displayed oldest-first for proper inventory rotation:
```sql
ORDER BY received_at ASC
```

### Batch Tracking

Each receive creates a unique batch:
```
BATCH-YYYYMMDD-NNN
```

### Local-First

- No backend required
- All data stored in browser
- Works completely offline
- No sync functionality (by design)
