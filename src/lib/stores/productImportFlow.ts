/**
 * Product Import Flow Store
 * Manages state for the CSV product import
 */

import { derived } from 'svelte/store';
import { createImportFlowStore } from './importFlowFactory';
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
 * Create the store using factory
 */
const flow = createImportFlowStore<
  ProductImportStep,
  ProductImportFlowState,
  ProductValidationResult,
  ProductImportResult
>(initialState);

/**
 * Main store
 */
export const productImportFlow = flow.store;

/**
 * Reset the flow to initial state
 */
export const resetProductImportFlow = flow.reset;

/**
 * Set the current step
 */
export const setProductImportStep = flow.setStep;

/**
 * Set the uploaded CSV data
 */
export const setProductCsvData = flow.setCsvData;

/**
 * Set the validation result
 */
export const setProductValidationResult = flow.setValidationResult;

/**
 * Set the import result
 */
export const setProductImportResult = flow.setResult;

/**
 * Derived store: Can proceed to import
 */
export const canProceedToImport = flow.canProceed;

/**
 * Derived store: Total products to import
 */
export const totalProductsToImport = derived(
  productImportFlow,
  $state => $state.validationResult?.parsed.length ?? 0
);
