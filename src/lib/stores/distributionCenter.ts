/**
 * Distribution Center Store
 *
 * Manages selected distribution center state
 */

import { writable, derived } from 'svelte/store';
import type { DistributionCenter } from '../types';
import {
  listActiveDistributionCenters,
  getDistributionCenterById
} from '../repositories/distributionCenterRepo';
import { getSelectedDcId, setSelectedDcId } from '../repositories/settingsRepo';

// Selected distribution center
const selectedDcStore = writable<DistributionCenter | null>(null);

// Available distribution centers
const availableDcsStore = writable<DistributionCenter[]>([]);

/**
 * Initialize distribution center from stored settings
 */
export function initDistributionCenter(): void {
  // Load available DCs
  const dcs = listActiveDistributionCenters();
  availableDcsStore.set(dcs);

  // Load selected DC from settings
  const dcId = getSelectedDcId();
  if (dcId) {
    const dc = getDistributionCenterById(dcId);
    selectedDcStore.set(dc);
  } else if (dcs.length === 1 && dcs[0]) {
    // Auto-select if only one DC
    selectedDcStore.set(dcs[0]);
    setSelectedDcId(dcs[0].id);
  }
}

/**
 * Select a distribution center
 */
export function selectDistributionCenter(dc: DistributionCenter): void {
  selectedDcStore.set(dc);
  setSelectedDcId(dc.id);
}

/**
 * Select a distribution center by ID
 */
export function selectDistributionCenterById(dcId: string): void {
  const dc = getDistributionCenterById(dcId);
  if (dc) {
    selectedDcStore.set(dc);
    setSelectedDcId(dcId);
  }
}

/**
 * Subscribe to selected distribution center
 */
export const selectedDc = {
  subscribe: selectedDcStore.subscribe
};

/**
 * Subscribe to available distribution centers
 */
export const availableDcs = {
  subscribe: availableDcsStore.subscribe
};

/**
 * Derived store: is DC selected
 */
export const isDcSelected = derived(selectedDcStore, $dc => $dc !== null);

/**
 * Get selected DC ID (synchronous)
 */
export function getDcId(): string | null {
  let dcId: string | null = null;
  selectedDcStore.subscribe(dc => {
    dcId = dc?.id ?? null;
  })();
  return dcId;
}
