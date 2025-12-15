/**
 * Release Flow Store
 *
 * Manages state for the release inventory wizard (full batch release only)
 */

import { writable } from 'svelte/store';
import type { ReleaseFlowState } from '../types';

const initial: ReleaseFlowState = {
  product: null,
  sourceBatch: null,
  sourcePosition: null,
  destinationPosition: null
};

export const releaseFlow = writable<ReleaseFlowState>(initial);

export function resetReleaseFlow(): void {
  releaseFlow.set(initial);
}

export function canSelectSource(s: ReleaseFlowState): boolean {
  return s.product !== null;
}

export function canSelectDestination(s: ReleaseFlowState): boolean {
  return s.sourceBatch !== null && s.sourcePosition !== null;
}

export function canConfirmRelease(s: ReleaseFlowState): boolean {
  return s.product !== null && s.sourceBatch !== null && s.sourcePosition !== null && s.destinationPosition !== null;
}

export function effectiveQuantity(s: ReleaseFlowState): number {
  return s.sourceBatch?.quantity ?? 0;
}
