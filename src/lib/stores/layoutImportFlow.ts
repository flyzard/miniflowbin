/**
 * Layout Import Flow Store
 * Manages state for the CSV import wizard
 */

import { writable, derived } from 'svelte/store';
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
 * Main store
 */
export const layoutImportFlow = writable<LayoutImportFlowState>(initialState);

/**
 * Reset the flow to initial state
 */
export function resetLayoutImportFlow(): void {
  layoutImportFlow.set(initialState);
}

/**
 * Set the current step
 */
export function setStep(step: ImportStep): void {
  layoutImportFlow.update(s => ({ ...s, step }));
}

/**
 * Set the uploaded CSV data
 */
export function setCsvData(fileName: string, rawCsv: string): void {
  layoutImportFlow.update(s => ({
    ...s,
    fileName,
    rawCsv
  }));
}

/**
 * Set the validation result
 */
export function setValidationResult(result: ImportValidationResult): void {
  layoutImportFlow.update(s => ({
    ...s,
    validationResult: result
  }));
}

/**
 * Set the preview summary
 */
export function setPreview(preview: ImportPreviewSummary): void {
  layoutImportFlow.update(s => ({
    ...s,
    preview
  }));
}

/**
 * Set the orphan strategy
 */
export function setOrphanStrategy(strategy: OrphanStrategy): void {
  layoutImportFlow.update(s => ({
    ...s,
    orphanStrategy: strategy
  }));
}

/**
 * Set the import result
 */
export function setImportResult(result: ImportResult): void {
  layoutImportFlow.update(s => ({
    ...s,
    result
  }));
}

/**
 * Derived store: Can proceed to preview step
 */
export const canProceedToPreview = derived(
  layoutImportFlow,
  $state => $state.validationResult?.valid === true
);

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
