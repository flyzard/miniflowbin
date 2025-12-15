# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowBin is a mobile-first, offline-capable warehouse inventory management PWA (Progressive Web App). It enables warehouse personnel to receive and release inventory without requiring constant network connectivity.

## Tech Stack

- **Framework**: Svelte
- **Build Tool**: Vite
- **Package Manager**: Bun
- **PWA**: vite-plugin-pwa
- **Local Database**: SQLite WASM with OPFS (primary) / IndexedDB (fallback)
- **State Management**: Svelte Stores
- **Backend**: REST API (separate service)

## Common Commands

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Run tests
bun test

# Run single test file
bun test <path-to-test>

# Lint
bun run lint
```

## Architecture

### Application Layers

1. **Presentation Layer** (`src/lib/components/`, `src/routes/`) - Svelte components and stores
2. **Service Layer** (`src/lib/services/`) - Business logic, validation, workflows
3. **Repository Layer** (`src/lib/repositories/`) - Data access, query building
4. **Storage Layer** (`src/lib/db/`) - SQLite WASM + OPFS/IndexedDB

### Key Data Entities

- **DistributionCenter**: Physical warehouse facility
- **Product**: Items tracked in inventory (SKU, name, category)
- **StoragePosition**: Physical storage locations (zone > aisle > rack > position)
- **InventoryBatch**: Quantity of product at a position, with batch number
- **Transaction**: Inventory movements (RECEIVE, RELEASE, ADJUST) with sync status

### Offline-First Design

- All data persisted locally in SQLite
- Transactions queue locally with `syncStatus: PENDING | SYNCED | FAILED | CONFLICT`
- Background sync when connectivity returns
- Full functionality available offline

### User Flows

- **Receive Inventory**: 2-step wizard (enter details → confirm)
- **Release Inventory**: 4-step wizard (select product → select source → select destination → confirm)

## UI/UX Guidelines

- Dark theme by default (warehouse environment optimization)
- Minimum touch targets: 44x44px (glove-friendly)
- High contrast for variable lighting conditions
- Mobile-first, single-column layouts
- Batch numbers format: `BATCH-YYYYMMDD-NNN`

## Sync Strategy

- Push: Local transactions → Server (FIFO order)
- Pull: Master data + inventory updates from server
- Conflicts detected during sync require user resolution
