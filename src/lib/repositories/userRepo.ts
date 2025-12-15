/**
 * User Repository
 */

import { query, queryOne } from '../db/database';
import type { User } from '../types';

/**
 * Get all users
 */
export function listUsers(): User[] {
  return query<User>(
    'SELECT * FROM users ORDER BY display_name'
  );
}

/**
 * Get all active users
 */
export function listActiveUsers(): User[] {
  return query<User>(
    'SELECT * FROM users WHERE is_active = 1 ORDER BY display_name'
  );
}

/**
 * Get a user by ID
 */
export function getUserById(id: string): User | null {
  return queryOne<User>(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
}

/**
 * Get a user by username
 */
export function getUserByUsername(username: string): User | null {
  return queryOne<User>(
    'SELECT * FROM users WHERE username = ?',
    [username]
  );
}
