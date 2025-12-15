/**
 * UI Store
 *
 * Manages UI state like loading, toasts, etc.
 */

import { writable, derived } from 'svelte/store';

// Loading state
const loadingStore = writable<boolean>(false);
const loadingMessageStore = writable<string>('');

// Toast notifications
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
}

const toastsStore = writable<Toast[]>([]);

let toastIdCounter = 0;

/**
 * Show loading indicator
 */
export function showLoading(message: string = 'Loading...'): void {
  loadingStore.set(true);
  loadingMessageStore.set(message);
}

/**
 * Hide loading indicator
 */
export function hideLoading(): void {
  loadingStore.set(false);
  loadingMessageStore.set('');
}

/**
 * Show a toast notification
 */
export function showToast(
  type: Toast['type'],
  message: string,
  duration: number = 3000
): string {
  const id = `toast-${++toastIdCounter}`;
  const toast: Toast = { id, type, message, duration };

  toastsStore.update(toasts => [...toasts, toast]);

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

/**
 * Show success toast
 */
export function showSuccess(message: string, duration?: number): string {
  return showToast('success', message, duration);
}

/**
 * Show error toast
 */
export function showError(message: string, duration?: number): string {
  return showToast('error', message, duration ?? 5000);
}

/**
 * Show warning toast
 */
export function showWarning(message: string, duration?: number): string {
  return showToast('warning', message, duration ?? 4000);
}

/**
 * Show info toast
 */
export function showInfo(message: string, duration?: number): string {
  return showToast('info', message, duration);
}

/**
 * Remove a toast by ID
 */
export function removeToast(id: string): void {
  toastsStore.update(toasts => toasts.filter(t => t.id !== id));
}

/**
 * Clear all toasts
 */
export function clearToasts(): void {
  toastsStore.set([]);
}

/**
 * Subscribe to loading state
 */
export const isLoading = {
  subscribe: loadingStore.subscribe
};

/**
 * Subscribe to loading message
 */
export const loadingMessage = {
  subscribe: loadingMessageStore.subscribe
};

/**
 * Subscribe to toasts
 */
export const toasts = {
  subscribe: toastsStore.subscribe
};
