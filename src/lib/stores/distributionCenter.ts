/**
 * Distribution Center Store
 *
 * Manages selected distribution center state
 */

import { writable } from 'svelte/store';
import type { DistributionCenter } from '../types';
import {
  listActiveDistributionCenters,
  getDistributionCenterById,
  getSelectedDcId,
  setSelectedDcId
} from '../repositories/settingsRepo';

// Selected distribution center
const selectedDcStore = writable<DistributionCenter | null>(null);

/**
 * Initialize distribution center from stored settings
 */
export async function initDistributionCenter(): Promise<void> {
  // Load available DCs
  const dcs = await listActiveDistributionCenters();

  // Load selected DC from settings
  const dcId = await getSelectedDcId();
  if (dcId) {
    const dc = await getDistributionCenterById(dcId);
    selectedDcStore.set(dc);
  } else if (dcs.length === 1 && dcs[0]) {
    // Auto-select if only one DC
    selectedDcStore.set(dcs[0]);
    await setSelectedDcId(dcs[0].id);
  }
}

/**
 * Subscribe to selected distribution center
 */
export const selectedDc = {
  subscribe: selectedDcStore.subscribe
};
