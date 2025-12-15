/**
 * UI Store
 *
 * Manages UI state like toasts
 */

import { writable } from 'svelte/store';

// Toast notifications
export interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
  duration: number;
}

const toastsStore = writable<Toast[]>([]);

let toastIdCounter = 0;

/**
 * Show a toast notification
 */
function showToast(
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
 * Remove a toast by ID
 */
export function removeToast(id: string): void {
  toastsStore.update(toasts => toasts.filter(t => t.id !== id));
}

/**
 * Subscribe to toasts
 */
export const toasts = {
  subscribe: toastsStore.subscribe
};
