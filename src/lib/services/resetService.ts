/**
 * Reset Service
 * Handles factory reset of the application
 */

import { transaction, exec } from '../db/database';

/**
 * Perform a factory reset - delete ALL data from the database
 *
 * This deletes tables in the correct order to respect foreign key constraints:
 * 1. transactions (references: products, batches, positions, users, dc)
 * 2. inventory_batches (references: products, positions, users, dc)
 * 3. storage_positions (references: dc)
 * 4. products (references: dc)
 * 5. users (no FK dependencies)
 * 6. distribution_centers (root table)
 * 7. app_settings (no FK)
 *
 * After reset, the database will be empty (no seeding).
 */
export function factoryReset(): void {
  transaction(() => {
    // Delete in order of FK dependencies (children first, parents last)
    exec('DELETE FROM transactions');
    exec('DELETE FROM inventory_batches');
    exec('DELETE FROM storage_positions');
    exec('DELETE FROM products');
    exec('DELETE FROM users');
    exec('DELETE FROM distribution_centers');
    exec('DELETE FROM app_settings');
  });
}
