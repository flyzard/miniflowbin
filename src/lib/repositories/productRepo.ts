/**
 * Product Repository
 */

import { query, queryOne } from '../db/database';
import type { Product } from '../types';

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
