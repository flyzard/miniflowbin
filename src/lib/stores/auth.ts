/**
 * Auth Store
 *
 * Manages current user state
 */

import { writable } from 'svelte/store';
import type { User } from '../types';
import { getUserById } from '../repositories/userRepo';
import { getCurrentUserId, setCurrentUserId } from '../repositories/settingsRepo';

// Current user store
const currentUserStore = writable<User | null>(null);

/**
 * Initialize auth from stored settings
 */
export function initAuth(): void {
  const userId = getCurrentUserId();
  if (userId) {
    const user = getUserById(userId);
    currentUserStore.set(user);
  }
}

/**
 * Set the current user
 */
export function setUser(user: User | null): void {
  currentUserStore.set(user);
  if (user) {
    setCurrentUserId(user.id);
  }
}

/**
 * Subscribe to current user
 */
export const currentUser = {
  subscribe: currentUserStore.subscribe
};
