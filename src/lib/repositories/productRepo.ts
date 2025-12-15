/**
 * Product Repository
 */

import { query, queryOne } from '../db/database';
import type { Product } from '../types';

/**
 * Get all products for a distribution center
 */
export function listProducts(distributionCenterId: string): Product[] {
  return query<Product>(
    'SELECT * FROM products WHERE distribution_center_id = ? AND is_active = 1 ORDER BY name',
    [distributionCenterId]
  );
}

/**
 * Get a product by ID
 */
export function getProductById(id: string): Product | null {
  return queryOne<Product>(
    'SELECT * FROM products WHERE id = ?',
    [id]
  );
}

/**
 * Search products by name or SKU
 */
export function searchProducts(searchTerm: string, distributionCenterId: string, limit: number = 50): Product[] {
  const term = `%${searchTerm}%`;
  return query<Product>(
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
export function listProductsWithInventory(distributionCenterId: string): Product[] {
  return query<Product>(
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
