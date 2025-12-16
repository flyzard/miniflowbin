/**
 * Auth Store
 *
 * Manages current user state
 */

import { writable } from 'svelte/store';
import type { User } from '../types';
import { getUserById, getCurrentUserId, setCurrentUserId } from '../repositories/settingsRepo';

// Current user store
const currentUserStore = writable<User | null>(null);

/**
 * Initialize auth from stored settings
 */
export async function initAuth(): Promise<void> {
  const userId = await getCurrentUserId();
  if (userId) {
    const user = await getUserById(userId);
    currentUserStore.set(user);
  }
}

/**
 * Set the current user
 */
export async function setUser(user: User | null): Promise<void> {
  currentUserStore.set(user);
  if (user) {
    await setCurrentUserId(user.id);
  }
}

/**
 * Subscribe to current user
 */
export const currentUser = {
  subscribe: currentUserStore.subscribe
};
