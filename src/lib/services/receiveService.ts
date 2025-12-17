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
import { formatDateCompact, padNumber } from '../utils/date';
import { formatError, logError } from '../utils/error';
import { tryImmediateUpload } from './dataSyncService';
import { authStore } from '../auth/authStore';

/**
 * Generate a new unique batch number
 *
 * Format: BATCH-YYYYMMDD-NNN
 * Example: BATCH-20251215-001
 */
export async function generateBatchNumber(distributionCenterId: string): Promise<string> {
  const dateStr = formatDateCompact();
  const todayCount = await getTodayBatchCount(distributionCenterId);
  const sequence = padNumber(todayCount + 1, 3);
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
export async function validateReceive(input: ReceiveInput): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Validate product exists
  const product = await getProductById(input.productId);
  if (!product) {
    errors.push('Product not found');
  } else if (!product.is_active) {
    errors.push('Product is not active');
  }

  // Validate position exists
  const position = await getPositionById(input.positionId);
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
export async function executeReceive(input: ReceiveInput): Promise<ReceiveResult> {
  // Validate input
  const validation = await validateReceive(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join('; ')
    };
  }

  try {
    // Generate batch number
    const batchNumber = await generateBatchNumber(input.distributionCenterId);

    // Execute in a transaction
    const result = await transaction(async () => {
      // Create the inventory batch
      const batch = await createBatch({
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
      const txn = await createTransaction({
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

    // Increment pending transaction count
    authStore.incrementPendingTransactionCount();

    // Try immediate upload (fire-and-forget, non-blocking)
    tryImmediateUpload(result.txn.id).then(uploaded => {
      if (uploaded) {
        authStore.decrementPendingTransactionCount();
      }
    });

    return {
      success: true,
      batch: result.batch,
      transaction: result.txn,
      batchNumber
    };
  } catch (error) {
    logError('ReceiveService', 'Error executing receive', error);
    return {
      success: false,
      error: formatError(error)
    };
  }
}
