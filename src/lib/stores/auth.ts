/**
 * Auth Store
 *
 * Manages current user state
 */

import { writable, derived } from 'svelte/store';
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
 * Log out the current user
 */
export function logout(): void {
  currentUserStore.set(null);
}

/**
 * Subscribe to current user
 */
export const currentUser = {
  subscribe: currentUserStore.subscribe
};

/**
 * Derived store: is user logged in
 */
export const isLoggedIn = derived(currentUserStore, $user => $user !== null);

/**
 * Get current user ID (synchronous, from store value)
 */
export function getUserId(): string | null {
  let userId: string | null = null;
  currentUserStore.subscribe(user => {
    userId = user?.id ?? null;
  })();
  return userId;
}
