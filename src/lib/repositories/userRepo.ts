/**
 * User Repository
 */

import { query, queryOne } from '../db/database';
import type { User } from '../types';

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
