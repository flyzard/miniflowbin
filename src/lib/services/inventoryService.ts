/**
 * Inventory Service
 *
 * Handles inventory queries and calculations
 */

import {
  listBatchesByProduct,
  listBatchesWithDetails,
  getTotalProductQuantity,
  getQuantityAtPosition
} from '../repositories/batchRepo';
import { listPositionsWithProduct } from '../repositories/positionRepo';
import {
  listProductsWithInventory,
  searchProductsWithInventory
} from '../repositories/productRepo';
import type {
  BatchWithDetails,
  ProductWithInventory,
  PositionWithInventory
} from '../types';

/**
 * Get available quantity for a product across all positions
 */
export function getAvailableQuantity(productId: string): number {
  return getTotalProductQuantity(productId);
}

/**
 * Get available quantity for a product at a specific position
 */
export function getQuantityAt(productId: string, positionId: string): number {
  return getQuantityAtPosition(productId, positionId);
}

/**
 * Get all positions that have inventory of a specific product
 */
export function getPositionsWithProduct(productId: string): PositionWithInventory[] {
  return listPositionsWithProduct(productId);
}

/**
 * Get all batches for a product with full details, sorted by received date (FIFO)
 * Oldest batches first for FIFO picking
 */
export function getBatchesForProduct(productId: string): BatchWithDetails[] {
  return listBatchesWithDetails(productId);
}

/**
 * Get all products that have available inventory
 */
export function getProductsWithInventory(distributionCenterId: string): ProductWithInventory[] {
  return listProductsWithInventory(distributionCenterId);
}

/**
 * Search products that have available inventory
 */
export function searchAvailableProducts(
  searchTerm: string,
  distributionCenterId: string
): ProductWithInventory[] {
  if (!searchTerm.trim()) {
    return getProductsWithInventory(distributionCenterId);
  }
  return searchProductsWithInventory(searchTerm, distributionCenterId);
}

/**
 * Check if a product has any available inventory
 */
export function hasInventory(productId: string): boolean {
  return getAvailableQuantity(productId) > 0;
}

/**
 * Get the oldest batch for a product (for FIFO)
 */
export function getOldestBatch(productId: string): BatchWithDetails | null {
  const batches = getBatchesForProduct(productId);
  return batches[0] ?? null;
}

/**
 * Validate that requested quantity is available in a batch
 */
export function validateBatchQuantity(batchId: string, requestedQuantity: number): {
  valid: boolean;
  availableQuantity: number;
  error?: string;
} {
  const batches = listBatchesByProduct('');
  // Find the batch - we need to query directly
  const batch = batches.find(b => b.id === batchId);

  if (!batch) {
    return {
      valid: false,
      availableQuantity: 0,
      error: 'Batch not found'
    };
  }

  if (batch.quantity < requestedQuantity) {
    return {
      valid: false,
      availableQuantity: batch.quantity,
      error: `Insufficient quantity. Available: ${batch.quantity}, Requested: ${requestedQuantity}`
    };
  }

  return {
    valid: true,
    availableQuantity: batch.quantity
  };
}
