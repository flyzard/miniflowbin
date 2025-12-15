/**
 * Release Flow Store
 *
 * Manages state for the release inventory wizard
 */

import { writable, derived, get } from 'svelte/store';
import type { Product, StoragePosition, InventoryBatch, ReleaseFlowState } from '../types';
import { ReleaseMode } from '../types';

// Initial state
const initialState: ReleaseFlowState = {
  product: null,
  mode: ReleaseMode.FULL_BATCH,
  quantity: null,
  sourceBatch: null,
  sourcePosition: null,
  destinationPosition: null
};

// Flow state store
const flowStateStore = writable<ReleaseFlowState>(initialState);

/**
 * Reset the release flow to initial state
 */
export function resetReleaseFlow(): void {
  flowStateStore.set(initialState);
}

/**
 * Set the selected product
 */
export function setReleaseProduct(product: Product | null): void {
  flowStateStore.update(state => ({
    ...state,
    product,
    // Reset dependent selections when product changes
    sourceBatch: null,
    sourcePosition: null
  }));
}

/**
 * Set the release mode
 */
export function setReleaseMode(mode: ReleaseMode): void {
  flowStateStore.update(state => ({
    ...state,
    mode,
    // Clear quantity if switching to full batch
    quantity: mode === ReleaseMode.FULL_BATCH ? null : state.quantity
  }));
}

/**
 * Set the specific quantity (for SPECIFIC_QUANTITY mode)
 */
export function setReleaseQuantity(quantity: number | null): void {
  flowStateStore.update(state => ({
    ...state,
    quantity: quantity !== null ? Math.max(1, Math.floor(quantity)) : null
  }));
}

/**
 * Set the source batch and position
 */
export function setReleaseSource(batch: InventoryBatch | null, position: StoragePosition | null): void {
  flowStateStore.update(state => ({
    ...state,
    sourceBatch: batch,
    sourcePosition: position
  }));
}

/**
 * Set the destination position
 */
export function setReleaseDestination(position: StoragePosition | null): void {
  flowStateStore.update(state => ({
    ...state,
    destinationPosition: position
  }));
}

/**
 * Subscribe to full release flow state
 */
export const releaseFlowState = {
  subscribe: flowStateStore.subscribe
};

/**
 * Derived: selected product
 */
export const releaseProduct = derived(flowStateStore, $state => $state.product);

/**
 * Derived: release mode
 */
export const releaseMode = derived(flowStateStore, $state => $state.mode);

/**
 * Derived: quantity
 */
export const releaseQuantity = derived(flowStateStore, $state => $state.quantity);

/**
 * Derived: source batch
 */
export const releaseBatch = derived(flowStateStore, $state => $state.sourceBatch);

/**
 * Derived: source position
 */
export const releaseSourcePosition = derived(flowStateStore, $state => $state.sourcePosition);

/**
 * Derived: destination position
 */
export const releaseDestination = derived(flowStateStore, $state => $state.destinationPosition);

/**
 * Derived: effective quantity to release
 */
export const effectiveReleaseQuantity = derived(flowStateStore, $state => {
  if ($state.mode === ReleaseMode.FULL_BATCH && $state.sourceBatch) {
    return $state.sourceBatch.quantity;
  }
  return $state.quantity ?? 0;
});

/**
 * Derived: can proceed to source selection (product selected)
 */
export const canSelectSource = derived(flowStateStore, $state =>
  $state.product !== null &&
  ($state.mode === ReleaseMode.FULL_BATCH || ($state.quantity !== null && $state.quantity > 0))
);

/**
 * Derived: can proceed to destination (source selected)
 */
export const canSelectDestination = derived(flowStateStore, $state =>
  $state.sourceBatch !== null && $state.sourcePosition !== null
);

/**
 * Derived: can confirm release (all fields filled)
 */
export const canConfirmRelease = derived(flowStateStore, $state =>
  $state.product !== null &&
  $state.sourceBatch !== null &&
  $state.sourcePosition !== null &&
  $state.destinationPosition !== null
);

/**
 * Get current flow state (synchronous)
 */
export function getReleaseFlowState(): ReleaseFlowState {
  return get(flowStateStore);
}
