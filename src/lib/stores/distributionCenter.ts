/**
 * Distribution Center Store
 *
 * Manages selected distribution center state
 */

import { writable } from 'svelte/store';
import type { DistributionCenter } from '../types';
import {
  listActiveDistributionCenters,
  getDistributionCenterById
} from '../repositories/distributionCenterRepo';
import { getSelectedDcId, setSelectedDcId } from '../repositories/settingsRepo';

// Selected distribution center
const selectedDcStore = writable<DistributionCenter | null>(null);

/**
 * Initialize distribution center from stored settings
 */
export function initDistributionCenter(): void {
  // Load available DCs
  const dcs = listActiveDistributionCenters();

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
 * Subscribe to selected distribution center
 */
export const selectedDc = {
  subscribe: selectedDcStore.subscribe
};
