/**
 * Release Service
 *
 * Handles releasing inventory from the warehouse (full batch release only)
 */

import { transaction } from '../db/database';
import {
  getBatchById,
  updateBatchQuantity
} from '../repositories/batchRepo';
import { createTransaction } from '../repositories/transactionRepo';
import { getPositionById, getPositionByCode, createPosition } from '../repositories/positionRepo';
import { TransactionType } from '../types';
import type { InventoryBatch, Transaction, Product, StoragePosition } from '../types';

export interface ReleaseInput {
  batchId: string;
  quantity: number;
  destinationPositionId: string;
  userId: string;
  distributionCenterId: string;
  notes?: string;
}

export interface ReleaseResult {
  success: boolean;
  transaction?: Transaction;
  releasedQuantity?: number;
  remainingQuantity?: number;
  error?: string;
}

/**
 * Validate release input (full batch release)
 */
export function validateRelease(input: ReleaseInput): {
  valid: boolean;
  errors: string[];
  batch?: InventoryBatch;
} {
  const errors: string[] = [];

  // Validate batch exists and has quantity
  const batch = getBatchById(input.batchId);
  if (!batch) {
    errors.push('Batch not found');
    return { valid: false, errors };
  }

  if (batch.quantity <= 0) {
    errors.push('Batch has no available quantity');
    return { valid: false, errors, batch };
  }

  // Validate destination position
  const destination = getPositionById(input.destinationPositionId);
  if (!destination) {
    errors.push('Destination position not found');
  } else if (!destination.is_active) {
    errors.push('Destination position is not active');
  }

  // Validate user ID
  if (!input.userId) {
    errors.push('User ID is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    batch
  };
}

/**
 * Execute release operation (full batch)
 *
 * Releases the entire batch quantity and records the transaction
 */
export function executeRelease(input: ReleaseInput): ReleaseResult {
  // Validate input
  const validation = validateRelease(input);
  if (!validation.valid || !validation.batch) {
    return {
      success: false,
      error: validation.errors.join('; ')
    };
  }

  const batch = validation.batch;
  const releaseQty = batch.quantity; // Always release full batch

  try {
    // Execute in a transaction
    const result = transaction(() => {
      // Update batch quantity to 0
      updateBatchQuantity(batch.id, 0);

      // Create the release transaction
      const txn = createTransaction({
        type: TransactionType.RELEASE,
        productId: batch.product_id,
        batchId: batch.id,
        fromPositionId: batch.position_id,
        toPositionId: input.destinationPositionId,
        quantity: releaseQty,
        userId: input.userId,
        distributionCenterId: input.distributionCenterId,
        notes: input.notes
      });

      return {
        txn,
        releasedQuantity: releaseQty,
        remainingQuantity: 0
      };
    });

    return {
      success: true,
      transaction: result.txn,
      releasedQuantity: result.releasedQuantity,
      remainingQuantity: result.remainingQuantity
    };
  } catch (error) {
    console.error('[ReleaseService] Error executing release:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Resolve or create destination position based on product SKU
 * The destination position code matches the product SKU
 */
export function resolveDestinationPosition(
  product: Product,
  distributionCenterId: string
): { position: StoragePosition; wasCreated: boolean } {
  // Try to find existing position with code = product SKU
  const existing = getPositionByCode(product.sku, distributionCenterId);

  if (existing) {
    return { position: existing, wasCreated: false };
  }

  // Auto-create position with SKU as code
  const newPosition = createPosition({
    code: product.sku,
    zone: 'Shipping',
    zoneType: 'Shipping',
    description: `Release destination for ${product.name}`,
    distributionCenterId
  });

  return { position: newPosition, wasCreated: true };
}
