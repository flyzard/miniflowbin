/**
 * Product Repository
 */

import { query, queryOne, exec } from '../db/database';
import type { Product } from '../types';
import { generateId, now } from '../types';

/**
 * Get all products for a distribution center
 */
export async function listProducts(distributionCenterId: string): Promise<Product[]> {
  return await query<Product>(
    'SELECT * FROM products WHERE distribution_center_id = ? AND is_active = 1 ORDER BY name',
    [distributionCenterId]
  );
}

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
 * Get a product by SKU within a distribution center
 */
export async function getProductBySku(sku: string, distributionCenterId: string): Promise<Product | null> {
  return await queryOne<Product>(
    'SELECT * FROM products WHERE sku = ? AND distribution_center_id = ?',
    [sku, distributionCenterId]
  );
}

/**
 * Create a new product
 */
export async function createProduct(data: {
  sku: string;
  name: string | null;
  description: string | null;
  category: string | null;
  color: string | null;
  size: string | null;
  unit_of_measure: string;
  distributionCenterId: string;
}): Promise<Product> {
  const id = generateId();
  const timestamp = now();

  await exec(
    `INSERT INTO products
     (id, sku, name, description, category, color, size, unit_of_measure, distribution_center_id, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      data.sku,
      data.name,
      data.description,
      data.category,
      data.color,
      data.size,
      data.unit_of_measure,
      data.distributionCenterId,
      timestamp,
      timestamp
    ]
  );

  return (await getProductById(id))!;
}
