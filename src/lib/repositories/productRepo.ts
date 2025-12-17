/**
 * Product Repository
 */

import { exec, query, queryOne } from '../db/database';
import type { Product } from '../types';
import { now } from '../types';

/**
 * Get a product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  return await queryOne<Product>(
    'SELECT * FROM products WHERE id = ?',
    [id]
  );
}

/**
 * Search products by name or SKU
 */
export async function searchProducts(searchTerm: string, distributionCenterId: string, limit: number = 50): Promise<Product[]> {
  const term = `%${searchTerm}%`;
  return await query<Product>(
    `SELECT * FROM products
     WHERE distribution_center_id = ?
       AND is_active = 1
       AND (name LIKE ? COLLATE NOCASE OR sku LIKE ? COLLATE NOCASE)
     ORDER BY
       CASE WHEN sku LIKE ? COLLATE NOCASE THEN 0 ELSE 1 END,
       name
     LIMIT ?`,
    [distributionCenterId, term, term, term, limit]
  );
}

/**
 * Get products that have available inventory
 */
export async function listProductsWithInventory(distributionCenterId: string): Promise<Product[]> {
  return await query<Product>(
    `SELECT
       p.*,
       COUNT(DISTINCT b.position_id) as position_count,
       COALESCE(SUM(b.quantity), 0) as total_quantity
     FROM products p
     LEFT JOIN inventory_batches b ON b.product_id = p.id AND b.quantity > 0
     WHERE p.distribution_center_id = ? AND p.is_active = 1
     GROUP BY p.id
     HAVING total_quantity > 0
     ORDER BY p.name`,
    [distributionCenterId]
  );
}

/**
 * Mark all products as inactive for a distribution center
 * (Soft delete - preserves FK relationships with transactions)
 */
export async function deactivateProductsForDc(distributionCenterId: string): Promise<void> {
  await exec(
    'UPDATE products SET is_active = 0, updated_at = ? WHERE distribution_center_id = ?',
    [now(), distributionCenterId]
  );
}

/**
 * Upsert multiple products (insert or update)
 * Products from server are marked active; missing ones stay inactive
 */
export async function upsertProducts(products: Array<{
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  color?: string;
  size?: string;
  unit_of_measure: string;
  distribution_center_id: string;
}>): Promise<void> {
  const timestamp = now();

  for (const product of products) {
    await exec(
      `INSERT INTO products (id, sku, name, description, category, color, size, unit_of_measure, distribution_center_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         sku = excluded.sku,
         name = excluded.name,
         description = excluded.description,
         category = excluded.category,
         color = excluded.color,
         size = excluded.size,
         unit_of_measure = excluded.unit_of_measure,
         is_active = 1,
         updated_at = excluded.updated_at`,
      [
        product.id,
        product.sku,
        product.name,
        product.description ?? null,
        product.category ?? null,
        product.color ?? null,
        product.size ?? null,
        product.unit_of_measure,
        product.distribution_center_id,
        timestamp,
        timestamp
      ]
    );
  }
}
