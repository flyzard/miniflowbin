/**
 * Layout Import Flow Store
 * Manages state for the CSV import wizard
 */

import { derived } from 'svelte/store';
import { createImportFlowStore } from './importFlowFactory';
import type {
  LayoutImportFlowState,
  ImportStep,
  OrphanStrategy,
  ImportValidationResult,
  ImportPreviewSummary,
  ImportResult
} from '../types';

/**
 * Initial state
 */
const initialState: LayoutImportFlowState = {
  step: 'upload',
  fileName: null,
  rawCsv: null,
  validationResult: null,
  preview: null,
  orphanStrategy: 'keep',
  result: null
};

/**
 * Create the store using factory
 */
const flow = createImportFlowStore<
  ImportStep,
  LayoutImportFlowState,
  ImportValidationResult,
  ImportResult
>(initialState);

/**
 * Main store
 */
export const layoutImportFlow = flow.store;

/**
 * Reset the flow to initial state
 */
export const resetLayoutImportFlow = flow.reset;

/**
 * Set the current step
 */
export const setStep = flow.setStep;

/**
 * Set the uploaded CSV data
 */
export const setCsvData = flow.setCsvData;

/**
 * Set the validation result
 */
export const setValidationResult = flow.setValidationResult;

/**
 * Set the import result
 */
export const setImportResult = flow.setResult;

/**
 * Set the preview summary (layout-specific)
 */
export function setPreview(preview: ImportPreviewSummary): void {
  flow.update(() => ({ preview }));
}

/**
 * Set the orphan strategy (layout-specific)
 */
export function setOrphanStrategy(strategy: OrphanStrategy): void {
  flow.update(() => ({ orphanStrategy: strategy }));
}

/**
 * Derived store: Can proceed to preview step
 */
export const canProceedToPreview = flow.canProceed;

/**
 * Derived store: Has any changes to apply
 */
export const hasChangesToApply = derived(
  layoutImportFlow,
  $state => {
    if (!$state.preview) return false;
    return (
      $state.preview.creates > 0 ||
      $state.preview.updates > 0 ||
      ($state.preview.orphanedEmpty > 0 && $state.orphanStrategy !== 'keep')
    );
  }
);

/**
 * Derived store: Total positions affected
 */
export const totalAffected = derived(
  layoutImportFlow,
  $state => {
    if (!$state.preview) return 0;
    let total = $state.preview.creates + $state.preview.updates;
    if ($state.orphanStrategy !== 'keep') {
      total += $state.preview.orphanedEmpty;
    }
    return total;
  }
);
