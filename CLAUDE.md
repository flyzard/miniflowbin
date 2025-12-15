# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowBin is a mobile-first, offline-capable warehouse inventory management PWA. It enables warehouse personnel to receive and release inventory. **This is a local-only application** - all data is stored locally in SQLite WASM with no backend sync.

## Tech Stack

- **Framework**: Svelte 5 (runes disabled for router compatibility)
- **Build Tool**: Vite + Bun
- **Router**: svelte-spa-router (hash-based SPA routing)
- **Database**: SQLite WASM with OPFS (primary) / in-memory fallback
- **Testing**: Vitest with jsdom

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Start dev server (requires COOP/COEP headers)
bun run build        # Production build
bun run check        # TypeScript type checking
bun run test         # Run all tests
bun run test -- src/lib/services/__tests__/receiveService.test.ts  # Single test file
```

## Architecture

### Layered Architecture

```
Routes (src/routes/)           → Page components, user flows
    ↓
Stores (src/lib/stores/)       → Svelte stores for flow state (receiveFlow, releaseFlow)
    ↓
Services (src/lib/services/)   → Business logic, validation
    ↓
Repositories (src/lib/repos/)  → Data access, SQL queries
    ↓
Database (src/lib/db/)         → SQLite WASM wrapper (database.ts)
```

### Data Flow Pattern

1. **App initialization** (`src/lib/init.ts`): DB init → schema migration → store hydration
2. **Wizard flows** use dedicated stores (`receiveFlow.ts`, `releaseFlow.ts`) to track multi-step state
3. **Services** validate inputs and orchestrate repository calls within transactions
4. **Repositories** execute raw SQL via `query()`, `exec()`, `insert()` from `database.ts`

### Key Data Entities

- **DistributionCenter**: Physical warehouse facility
- **Product**: Items tracked (SKU, name, category)
- **StoragePosition**: Physical locations (zone > aisle > rack > level)
- **InventoryBatch**: Quantity at a position with batch number
- **Transaction**: Inventory movements (RECEIVE, RELEASE, ADJUST)

### User Flows

- **Receive**: 2-step wizard (`/receive` → `/receive/confirm`)
- **Release**: 4-step wizard (`/release` → `/release/source` → `/release/destination` → `/release/confirm`)

## Testing

Tests are in `__tests__` directories alongside source files. The database module must be mocked since SQLite WASM cannot run in Node.js:

```typescript
vi.mock('../../db/database', () => ({
  query: vi.fn(),
  exec: vi.fn(),
  insert: vi.fn(),
  transaction: vi.fn()
}));
```

## UI/UX Guidelines

- Dark theme (warehouse environment optimization)
- Minimum 44x44px touch targets (glove-friendly)
- Batch numbers: `BATCH-YYYYMMDD-NNN`
- FIFO picking (oldest batches first)

## Development Notes

- **Svelte 5 runes disabled** in `svelte.config.js` for svelte-spa-router compatibility
- **COOP/COEP headers** required for SharedArrayBuffer (OPFS) - configured in `vite.config.ts`
- **WASM files** excluded from hashing in build output for SQLite compatibility
- **$lib alias** configured for imports (`$lib` → `src/lib`)
