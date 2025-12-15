/**
 * Distribution Center Repository
 */

import { query, queryOne } from '../db/database';
import type { DistributionCenter } from '../types';

/**
 * Get all distribution centers
 */
export function listDistributionCenters(): DistributionCenter[] {
  return query<DistributionCenter>(
    'SELECT * FROM distribution_centers ORDER BY name'
  );
}

/**
 * Get all active distribution centers
 */
export function listActiveDistributionCenters(): DistributionCenter[] {
  return query<DistributionCenter>(
    'SELECT * FROM distribution_centers WHERE is_active = 1 ORDER BY name'
  );
}

/**
 * Get a distribution center by ID
 */
export function getDistributionCenterById(id: string): DistributionCenter | null {
  return queryOne<DistributionCenter>(
    'SELECT * FROM distribution_centers WHERE id = ?',
    [id]
  );
}

/**
 * Get a distribution center by code
 */
export function getDistributionCenterByCode(code: string): DistributionCenter | null {
  return queryOne<DistributionCenter>(
    'SELECT * FROM distribution_centers WHERE code = ?',
    [code]
  );
}
