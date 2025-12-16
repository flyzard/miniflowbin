/**
 * Import Flow Store Factory
 * Creates reusable import flow stores with common functionality
 */

import { writable, derived, type Writable, type Readable } from 'svelte/store';

/**
 * Base state interface that all import flows must have
 */
export interface BaseImportFlowState<TStep, TValidation, TResult> {
  step: TStep;
  fileName: string | null;
  rawCsv: string | null;
  validationResult: TValidation | null;
  result: TResult | null;
}

/**
 * Common actions returned by the factory
 */
export interface ImportFlowActions<TStep, TState, TValidation, TResult> {
  /** The main store */
  store: Writable<TState>;
  /** Reset to initial state */
  reset: () => void;
  /** Set current step */
  setStep: (step: TStep) => void;
  /** Set CSV file data */
  setCsvData: (fileName: string, rawCsv: string) => void;
  /** Set validation result */
  setValidationResult: (result: TValidation) => void;
  /** Set import result */
  setResult: (result: TResult) => void;
  /** Update state with partial values */
  update: (updater: (state: TState) => Partial<TState>) => void;
  /** Derived store: can proceed with import */
  canProceed: Readable<boolean>;
}

/**
 * Configuration for creating an import flow store
 */
export interface ImportFlowConfig<TState, TValidation> {
  /** Check if validation allows proceeding */
  canProceedCheck?: (state: TState) => boolean;
  /** Default can proceed check uses validationResult.valid */
  defaultCanProceed?: boolean;
}

/**
 * Create an import flow store with common functionality
 *
 * @param initialState - Initial state for the store
 * @param config - Optional configuration
 * @returns Store and action functions
 */
export function createImportFlowStore<
  TStep,
  TState extends BaseImportFlowState<TStep, TValidation, TResult>,
  TValidation extends { valid: boolean; parsed: unknown[] },
  TResult
>(
  initialState: TState,
  config?: ImportFlowConfig<TState, TValidation>
): ImportFlowActions<TStep, TState, TValidation, TResult> {
  const store = writable<TState>(initialState);

  const reset = () => store.set(initialState);

  const setStep = (step: TStep) => {
    store.update(s => ({ ...s, step }));
  };

  const setCsvData = (fileName: string, rawCsv: string) => {
    store.update(s => ({ ...s, fileName, rawCsv }));
  };

  const setValidationResult = (result: TValidation) => {
    store.update(s => ({ ...s, validationResult: result }));
  };

  const setResult = (result: TResult) => {
    store.update(s => ({ ...s, result }));
  };

  const update = (updater: (state: TState) => Partial<TState>) => {
    store.update(s => ({ ...s, ...updater(s) }));
  };

  // Default can proceed check: valid validation with at least one parsed item
  const defaultCheck = (state: TState): boolean => {
    return state.validationResult?.valid === true &&
           (state.validationResult?.parsed.length ?? 0) > 0;
  };

  const canProceed = derived(
    store,
    $state => config?.canProceedCheck
      ? config.canProceedCheck($state)
      : defaultCheck($state)
  );

  return {
    store,
    reset,
    setStep,
    setCsvData,
    setValidationResult,
    setResult,
    update,
    canProceed
  };
}
