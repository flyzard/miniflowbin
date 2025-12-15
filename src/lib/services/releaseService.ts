/**
 * Release Service
 *
 * Handles releasing inventory from the warehouse
 */

import { transaction } from '../db/database';
import {
  getBatchById,
  updateBatchQuantity
} from '../repositories/batchRepo';
import { createTransaction } from '../repositories/transactionRepo';
import { getPositionById } from '../repositories/positionRepo';
import { TransactionType, ReleaseMode } from '../types';
import type { InventoryBatch, Transaction } from '../types';

export interface ReleaseInput {
  batchId: string;
  quantity: number;
  destinationPositionId: string;
  userId: string;
  distributionCenterId: string;
  releaseMode: ReleaseMode;
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

  // Validate quantity
  const requestedQty = input.releaseMode === ReleaseMode.FULL_BATCH
    ? batch.quantity
    : input.quantity;

  if (!Number.isInteger(requestedQty) || requestedQty < 1) {
    errors.push('Quantity must be a positive integer');
  }

  if (requestedQty > batch.quantity) {
    errors.push(`Insufficient quantity. Available: ${batch.quantity}, Requested: ${requestedQty}`);
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
 * Execute release operation
 *
 * Decreases batch quantity and records the release transaction
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

  try {
    // Determine quantity to release
    const releaseQty = input.releaseMode === ReleaseMode.FULL_BATCH
      ? batch.quantity
      : input.quantity;

    // Execute in a transaction
    const result = transaction(() => {
      // Update batch quantity
      const newQuantity = batch.quantity - releaseQty;
      updateBatchQuantity(batch.id, newQuantity);

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
        remainingQuantity: newQuantity
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
 * Quick release of full batch
 */
export function executeFullBatchRelease(
  batchId: string,
  destinationPositionId: string,
  userId: string,
  distributionCenterId: string,
  notes?: string
): ReleaseResult {
  const batch = getBatchById(batchId);
  if (!batch) {
    return {
      success: false,
      error: 'Batch not found'
    };
  }

  return executeRelease({
    batchId,
    quantity: batch.quantity,
    destinationPositionId,
    userId,
    distributionCenterId,
    releaseMode: ReleaseMode.FULL_BATCH,
    notes
  });
}
