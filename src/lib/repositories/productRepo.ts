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
 * Clear all products for a distribution center
 */
export async function clearProductsForDc(distributionCenterId: string): Promise<void> {
  await exec(
    'DELETE FROM products WHERE distribution_center_id = ?',
    [distributionCenterId]
  );
}

/**
 * Insert multiple products (batch insert)
 */
export async function insertProducts(products: Array<{
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
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
