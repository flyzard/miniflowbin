/**
 * Product Repository
 */

import { exec, execBulkUpsert, query, queryOne } from '../db/database';
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
  const hasSearch = searchTerm.trim().length > 0;

  return await query<Product>(
    `SELECT * FROM products
     WHERE distribution_center_id = ?
       AND is_active = 1
       AND (name LIKE ? COLLATE NOCASE OR sku LIKE ? COLLATE NOCASE)
     ORDER BY
       CASE WHEN sku LIKE ? COLLATE NOCASE THEN 0 ELSE 1 END,
       name
     ${hasSearch ? 'LIMIT ?' : ''}`,
    hasSearch
      ? [distributionCenterId, term, term, term, limit]
      : [distributionCenterId, term, term, term]
  );
}

/**
 * Get products that have releasable inventory (excludes shipping/release positions)
 */
export async function listProductsWithInventory(distributionCenterId: string): Promise<Product[]> {
  return await query<Product>(
    `SELECT
       p.*,
       COUNT(DISTINCT b.position_id) as position_count,
       COALESCE(SUM(b.quantity), 0) as total_quantity
     FROM products p
     INNER JOIN inventory_batches b ON b.product_id = p.id
       AND b.quantity > 0
       AND b.is_active = 1
     INNER JOIN storage_positions sp ON sp.id = b.position_id
       AND sp.is_active = 1
       AND (sp.zone_type IS NULL OR sp.zone_type NOT IN ('SHIPPING', 'OUTBOUND', 'Shipping'))
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
 * Uses bulk insert for performance (~50x faster than individual inserts)
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
  if (products.length === 0) return;

  const timestamp = now();

  const columns = [
    'id', 'sku', 'name', 'description', 'category', 'color', 'size',
    'unit_of_measure', 'distribution_center_id', 'is_active', 'created_at', 'updated_at'
  ];

  const rows = products.map(p => [
    p.id,
    p.sku,
    p.name,
    p.description ?? null,
    p.category ?? null,
    p.color ?? null,
    p.size ?? null,
    p.unit_of_measure,
    p.distribution_center_id,
    1,
    timestamp,
    timestamp
  ]);

  const onConflict = `(id) DO UPDATE SET
    sku = excluded.sku,
    name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    color = excluded.color,
    size = excluded.size,
    unit_of_measure = excluded.unit_of_measure,
    is_active = 1,
    updated_at = excluded.updated_at`;

  await execBulkUpsert('products', columns, rows, onConflict);
}
