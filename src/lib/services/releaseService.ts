/**
 * Release Service
 *
 * Handles releasing inventory from the warehouse (supports partial and full batch release)
 */

import { transaction } from '../db/database';
import {
  getBatchById,
  updateBatchQuantity
} from '../repositories/batchRepo';
import { createTransaction } from '../repositories/transactionRepo';
import { getPositionById, getOrCreateShippingPosition } from '../repositories/positionRepo';
import { TransactionType } from '../types';
import type { InventoryBatch, Transaction, Product, StoragePosition } from '../types';
import { formatError, logError } from '../utils/error';
import { recordTransactionWithUpload } from './transactionHelper';

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
 * Validate release input
 */
export async function validateRelease(input: ReleaseInput): Promise<{
  valid: boolean;
  errors: string[];
  batch?: InventoryBatch;
}> {
  const errors: string[] = [];

  // Validate batch exists and has quantity
  const batch = await getBatchById(input.batchId);
  if (!batch) {
    errors.push('Batch not found');
    return { valid: false, errors };
  }

  if (batch.quantity <= 0) {
    errors.push('Batch has no available quantity');
    return { valid: false, errors, batch };
  }

  // Validate release quantity
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    errors.push('Quantity must be a positive integer');
  } else if (input.quantity > batch.quantity) {
    errors.push(`Cannot release ${input.quantity} units. Only ${batch.quantity} available.`);
  }

  // Validate destination position
  const destination = await getPositionById(input.destinationPositionId);
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
 * Execute release operation
 *
 * Releases the specified quantity and records the transaction
 */
export async function executeRelease(input: ReleaseInput): Promise<ReleaseResult> {
  // Validate input
  const validation = await validateRelease(input);
  if (!validation.valid || !validation.batch) {
    return {
      success: false,
      error: validation.errors.join('; ')
    };
  }

  const batch = validation.batch;
  const releaseQty = input.quantity;
  const remainingQty = batch.quantity - releaseQty;

  try {
    // Execute in a transaction
    const result = await transaction(async () => {
      // Update batch quantity (subtract released amount)
      await updateBatchQuantity(batch.id, remainingQty);

      // Create the release transaction
      const txn = await createTransaction({
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
        remainingQuantity: remainingQty
      };
    });

    // Record transaction and attempt immediate upload
    recordTransactionWithUpload(result.txn.id);

    return {
      success: true,
      transaction: result.txn,
      releasedQuantity: result.releasedQuantity,
      remainingQuantity: result.remainingQuantity
    };
  } catch (error) {
    logError('ReleaseService', 'Error executing release', error);
    return {
      success: false,
      error: formatError(error)
    };
  }
}

/**
 * Resolve or create destination position based on product SKU
 * The destination position code matches the product SKU
 * Handles reactivation of inactive positions
 */
export async function resolveDestinationPosition(
  product: Product,
  distributionCenterId: string
): Promise<{ position: StoragePosition; wasCreated: boolean }> {
  return await getOrCreateShippingPosition({
    code: product.sku,
    zone: 'Shipping',
    zoneType: 'Shipping',
    description: `Release destination for ${product.name}`,
    distributionCenterId
  });
}
