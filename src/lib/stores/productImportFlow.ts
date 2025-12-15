/**
 * Product Import Flow Store
 * Manages state for the CSV product import
 */

import { writable, derived } from 'svelte/store';
import type {
  ProductImportFlowState,
  ProductImportStep,
  ProductValidationResult,
  ProductImportResult
} from '../types';

/**
 * Initial state
 */
const initialState: ProductImportFlowState = {
  step: 'upload',
  fileName: null,
  rawCsv: null,
  validationResult: null,
  result: null
};

/**
 * Main store
 */
export const productImportFlow = writable<ProductImportFlowState>(initialState);

/**
 * Reset the flow to initial state
 */
export function resetProductImportFlow(): void {
  productImportFlow.set(initialState);
}

/**
 * Set the current step
 */
export function setProductImportStep(step: ProductImportStep): void {
  productImportFlow.update(s => ({ ...s, step }));
}

/**
 * Set the uploaded CSV data
 */
export function setProductCsvData(fileName: string, rawCsv: string): void {
  productImportFlow.update(s => ({
    ...s,
    fileName,
    rawCsv
  }));
}

/**
 * Set the validation result
 */
export function setProductValidationResult(result: ProductValidationResult): void {
  productImportFlow.update(s => ({
    ...s,
    validationResult: result
  }));
}

/**
 * Set the import result
 */
export function setProductImportResult(result: ProductImportResult): void {
  productImportFlow.update(s => ({
    ...s,
    result
  }));
}

/**
 * Derived store: Can proceed to import
 */
export const canProceedToImport = derived(
  productImportFlow,
  $state => $state.validationResult?.valid === true && ($state.validationResult?.parsed.length ?? 0) > 0
);

/**
 * Derived store: Total products to import
 */
export const totalProductsToImport = derived(
  productImportFlow,
  $state => $state.validationResult?.parsed.length ?? 0
);
