/**
 * Receive Flow Store
 *
 * Manages state for the receive inventory wizard
 */

import { writable } from 'svelte/store';
import type { ReceiveFlowState } from '../types';

const initial: ReceiveFlowState = {
  product: null,
  quantity: 1,
  position: null,
  batchNumber: null
};

export const receiveFlow = writable<ReceiveFlowState>(initial);

export function resetReceiveFlow(): void {
  receiveFlow.set(initial);
}

export function canConfirmReceive(s: ReceiveFlowState): boolean {
  return s.product !== null && s.position !== null && s.quantity > 0;
}
