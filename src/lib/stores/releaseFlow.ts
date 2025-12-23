/**
 * Release Flow Store
 *
 * Manages state for the release inventory wizard
 */

import { writable } from 'svelte/store';
import type { ReleaseFlowState } from '../types';

const initial: ReleaseFlowState = {
  product: null,
  sourceBatch: null,
  sourcePosition: null,
  destinationPosition: null,
  quantity: null
};

export const releaseFlow = writable<ReleaseFlowState>(initial);

export function resetReleaseFlow(): void {
  releaseFlow.set(initial);
}

export function canSelectSource(s: ReleaseFlowState): boolean {
  return s.product !== null;
}

export function canSelectDestination(s: ReleaseFlowState): boolean {
  return (
    s.sourceBatch !== null &&
    s.sourcePosition !== null &&
    s.quantity !== null &&
    s.quantity >= 1 &&
    s.quantity <= s.sourceBatch.quantity
  );
}

export function canConfirmRelease(s: ReleaseFlowState): boolean {
  return s.product !== null && s.sourceBatch !== null && s.sourcePosition !== null && s.destinationPosition !== null;
}

export function effectiveQuantity(s: ReleaseFlowState): number {
  if (s.quantity !== null && s.quantity > 0) {
    return s.quantity;
  }
  return s.sourceBatch?.quantity ?? 0;
}

export function isPartialRelease(s: ReleaseFlowState): boolean {
  if (!s.sourceBatch || s.quantity === null) return false;
  return s.quantity < s.sourceBatch.quantity;
}
