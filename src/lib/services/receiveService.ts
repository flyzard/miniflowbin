/**
 * Receive Service
 *
 * Handles receiving inventory into the warehouse
 */

import { transaction } from '../db/database';
import { createBatch, getTodayBatchCount } from '../repositories/batchRepo';
import { createTransaction } from '../repositories/transactionRepo';
import { getProductById } from '../repositories/productRepo';
import { getPositionById } from '../repositories/positionRepo';
import { TransactionType } from '../types';
import type { InventoryBatch, Transaction } from '../types';

/**
 * Generate a new unique batch number
 *
 * Format: BATCH-YYYYMMDD-NNN
 * Example: BATCH-20251215-001
 */
export function generateBatchNumber(distributionCenterId: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Get count of batches already created today
  const todayCount = getTodayBatchCount(distributionCenterId);
  const nextNumber = todayCount + 1;
  const sequence = String(nextNumber).padStart(3, '0');

  return `BATCH-${dateStr}-${sequence}`;
}

export interface ReceiveInput {
  productId: string;
  positionId: string;
  quantity: number;
  userId: string;
  distributionCenterId: string;
  expirationDate?: string;
  lotNumber?: string;
  notes?: string;
}

export interface ReceiveResult {
  success: boolean;
  batch?: InventoryBatch;
  transaction?: Transaction;
  batchNumber?: string;
  error?: string;
}

/**
 * Validate receive input
 */
export function validateReceive(input: ReceiveInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate product exists
  const product = getProductById(input.productId);
  if (!product) {
    errors.push('Product not found');
  } else if (!product.is_active) {
    errors.push('Product is not active');
  }

  // Validate position exists
  const position = getPositionById(input.positionId);
  if (!position) {
    errors.push('Storage position not found');
  } else if (!position.is_active) {
    errors.push('Storage position is not active');
  }

  // Validate quantity
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    errors.push('Quantity must be a positive integer');
  }

  // Validate user ID
  if (!input.userId) {
    errors.push('User ID is required');
  }

  // Validate distribution center
  if (!input.distributionCenterId) {
    errors.push('Distribution center ID is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Execute receive operation
 *
 * Creates a new inventory batch and records the receive transaction
 */
export function executeReceive(input: ReceiveInput): ReceiveResult {
  // Validate input
  const validation = validateReceive(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join('; ')
    };
  }

  try {
    // Generate batch number
    const batchNumber = generateBatchNumber(input.distributionCenterId);

    // Execute in a transaction
    const result = transaction(() => {
      // Create the inventory batch
      const batch = createBatch({
        batchNumber,
        productId: input.productId,
        positionId: input.positionId,
        quantity: input.quantity,
        receivedBy: input.userId,
        distributionCenterId: input.distributionCenterId,
        expirationDate: input.expirationDate,
        lotNumber: input.lotNumber
      });

      // Create the receive transaction
      const txn = createTransaction({
        type: TransactionType.RECEIVE,
        productId: input.productId,
        batchId: batch.id,
        toPositionId: input.positionId,
        quantity: input.quantity,
        userId: input.userId,
        distributionCenterId: input.distributionCenterId,
        notes: input.notes
      });

      return { batch, txn };
    });

    return {
      success: true,
      batch: result.batch,
      transaction: result.txn,
      batchNumber
    };
  } catch (error) {
    console.error('[ReceiveService] Error executing receive:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
