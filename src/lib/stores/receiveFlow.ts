/**
 * Receive Flow Store
 *
 * Manages state for the receive inventory wizard
 */

import { writable, derived, get } from 'svelte/store';
import type { Product, StoragePosition, ReceiveFlowState } from '../types';

// Initial state
const initialState: ReceiveFlowState = {
  product: null,
  quantity: 1,
  position: null,
  batchNumber: null
};

// Flow state store
const flowStateStore = writable<ReceiveFlowState>(initialState);

/**
 * Reset the receive flow to initial state
 */
export function resetReceiveFlow(): void {
  flowStateStore.set(initialState);
}

/**
 * Set the selected product
 */
export function setReceiveProduct(product: Product | null): void {
  flowStateStore.update(state => ({
    ...state,
    product
  }));
}

/**
 * Set the quantity
 */
export function setReceiveQuantity(quantity: number): void {
  flowStateStore.update(state => ({
    ...state,
    quantity: Math.max(1, Math.floor(quantity))
  }));
}

/**
 * Set the storage position
 */
export function setReceivePosition(position: StoragePosition | null): void {
  flowStateStore.update(state => ({
    ...state,
    position
  }));
}

/**
 * Set the generated batch number
 */
export function setReceiveBatchNumber(batchNumber: string): void {
  flowStateStore.update(state => ({
    ...state,
    batchNumber
  }));
}

/**
 * Subscribe to full receive flow state
 */
export const receiveFlowState = {
  subscribe: flowStateStore.subscribe
};

/**
 * Derived: selected product
 */
export const receiveProduct = derived(flowStateStore, $state => $state.product);

/**
 * Derived: quantity
 */
export const receiveQuantity = derived(flowStateStore, $state => $state.quantity);

/**
 * Derived: selected position
 */
export const receivePosition = derived(flowStateStore, $state => $state.position);

/**
 * Derived: batch number
 */
export const receiveBatchNumber = derived(flowStateStore, $state => $state.batchNumber);

/**
 * Derived: can proceed to confirmation (all required fields filled)
 */
export const canConfirmReceive = derived(flowStateStore, $state =>
  $state.product !== null &&
  $state.position !== null &&
  $state.quantity > 0
);

/**
 * Get current flow state (synchronous)
 */
export function getReceiveFlowState(): ReceiveFlowState {
  return get(flowStateStore);
}
