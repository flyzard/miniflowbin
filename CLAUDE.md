# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowBin is a mobile-first, offline-capable warehouse inventory management app. It enables warehouse personnel to receive and release inventory. **This is a local-only application** - all data is stored locally in SQLite with no backend sync. Supports both web (PWA) and Android via Capacitor.

## Tech Stack

- **Framework**: Svelte 5 (runes disabled for router compatibility)
- **Build Tool**: Vite + Bun
- **Router**: svelte-spa-router (hash-based SPA routing)
- **Database**: Capacitor SQLite with jeep-sqlite (web) / native SQLite (Android)
- **Mobile**: Capacitor for Android builds
- **Testing**: Vitest with jsdom

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Start dev server
bun run build        # Production build
bun run check        # TypeScript type checking
bun run test         # Run all tests
bun run test -- src/lib/services/__tests__/receiveService.test.ts  # Single test file

# Android
bun run android:build   # Build web + sync to Android
bun run cap:sync        # Sync web assets to Android
bun run cap:open        # Open in Android Studio
```

## Architecture

### Layered Architecture

```
Routes (src/routes/)                → Page components, user flows
    ↓
Stores (src/lib/stores/)            → Svelte stores for flow state (receiveFlow, releaseFlow)
    ↓
Services (src/lib/services/)        → Business logic, validation
    ↓
Repositories (src/lib/repositories/) → Data access, SQL queries
    ↓
Database (src/lib/db/)              → Capacitor SQLite wrapper (database.ts)
```

### Data Flow Pattern

1. **App initialization** (`src/lib/init.ts`): DB init → schema migration → store hydration
2. **Wizard flows** use dedicated stores (`receiveFlow.ts`, `releaseFlow.ts`) to track multi-step state
3. **Services** validate inputs and orchestrate repository calls within transactions
4. **Repositories** execute raw SQL via `query()`, `queryOne()`, `exec()`, `transaction()` from `database.ts`

### Key Data Entities

- **DistributionCenter**: Physical warehouse facility
- **Product**: Items tracked (SKU, name, category)
- **StoragePosition**: Physical locations (zone > aisle > rack > level)
- **InventoryBatch**: Quantity at a position with batch number
- **Transaction**: Inventory movements (RECEIVE, RELEASE, ADJUST)

### User Flows

- **Receive**: 2-step wizard (`/receive` → `/receive/confirm`)
- **Release**: 3-step wizard (`/release` → `/release/source` → `/release/confirm`)

## Testing

Tests are in `__tests__` directories alongside source files. The database module must be mocked since Capacitor SQLite cannot run in Node.js:

```typescript
vi.mock('../../db/database', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  exec: vi.fn(),
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
- **jeep-sqlite WASM files** must be in `/public/assets` for web SQLite support
- **$lib alias** configured for imports (`$lib` → `src/lib`)
- **Web transactions** save to IndexedDB via `saveToStore()` after commit
