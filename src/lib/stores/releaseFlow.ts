/**
 * Release Flow Store
 *
 * Manages state for the release inventory wizard
 */

import { writable } from 'svelte/store';
import type { ReleaseFlowState } from '../types';
import { ReleaseMode } from '../types';

const initial: ReleaseFlowState = {
  product: null,
  mode: ReleaseMode.FULL_BATCH,
  quantity: null,
  sourceBatch: null,
  sourcePosition: null,
  destinationPosition: null
};

export const releaseFlow = writable<ReleaseFlowState>(initial);

export function resetReleaseFlow(): void {
  releaseFlow.set(initial);
}

export function canSelectSource(s: ReleaseFlowState): boolean {
  return s.product !== null && (s.mode === ReleaseMode.FULL_BATCH || (s.quantity !== null && s.quantity > 0));
}

export function canSelectDestination(s: ReleaseFlowState): boolean {
  return s.sourceBatch !== null && s.sourcePosition !== null;
}

export function canConfirmRelease(s: ReleaseFlowState): boolean {
  return s.product !== null && s.sourceBatch !== null && s.sourcePosition !== null && s.destinationPosition !== null;
}

export function effectiveQuantity(s: ReleaseFlowState): number {
  return s.mode === ReleaseMode.FULL_BATCH && s.sourceBatch ? s.sourceBatch.quantity : (s.quantity ?? 0);
}
