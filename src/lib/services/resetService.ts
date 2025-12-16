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
export async function factoryReset(): Promise<void> {
  await transaction(async () => {
    // Delete in order of FK dependencies (children first, parents last)
    await exec('DELETE FROM transactions');
    await exec('DELETE FROM inventory_batches');
    await exec('DELETE FROM storage_positions');
    await exec('DELETE FROM products');
    await exec('DELETE FROM users');
    await exec('DELETE FROM distribution_centers');
    await exec('DELETE FROM app_settings');
  });
}
