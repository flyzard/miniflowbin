/**
 * Transaction Repository
 */

import { exec, query, queryOne } from '../db/database';
import type { Transaction, TransactionType } from '../types';
import { generateId, now } from '../types';

/**
 * Get a transaction by ID
 */
export async function getTransactionById(id: string): Promise<Transaction | null> {
  return await queryOne<Transaction>(
    'SELECT * FROM transactions WHERE id = ?',
    [id]
  );
}

/**
 * Create a new transaction (with sync_status = 'pending')
 */
export async function createTransaction(data: {
  type: TransactionType;
  productId: string;
  batchId?: string;
  fromPositionId?: string;
  toPositionId?: string;
  quantity: number;
  userId: string;
  distributionCenterId: string;
  notes?: string;
}): Promise<Transaction> {
  const id = generateId();
  const timestamp = now();

  await exec(
    `INSERT INTO transactions
     (id, type, product_id, batch_id, from_position_id, to_position_id, quantity, timestamp, user_id, distribution_center_id, notes, created_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      id,
      data.type,
      data.productId,
      data.batchId ?? null,
      data.fromPositionId ?? null,
      data.toPositionId ?? null,
      data.quantity,
      timestamp,
      data.userId,
      data.distributionCenterId,
      data.notes ?? null,
      timestamp
    ]
  );

  return (await getTransactionById(id))!;
}

// ============================================================================
// Sync Query Functions
// ============================================================================

/**
 * Get all pending transactions (not yet synced)
 */
export async function getPendingTransactions(distributionCenterId: string): Promise<Transaction[]> {
  return await query<Transaction>(
    `SELECT * FROM transactions
     WHERE distribution_center_id = ?
       AND sync_status = 'pending'
     ORDER BY timestamp ASC`,
    [distributionCenterId]
  );
}

/**
 * Get count of pending transactions
 */
export async function getPendingTransactionCount(distributionCenterId: string): Promise<number> {
  const result = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions
     WHERE distribution_center_id = ? AND sync_status = 'pending'`,
    [distributionCenterId]
  );
  return result?.count ?? 0;
}

/**
 * Mark a transaction as synced
 */
export async function markTransactionSynced(transactionId: string): Promise<void> {
  await exec(
    `UPDATE transactions
     SET sync_status = 'synced', synced_at = ?, sync_error = NULL
     WHERE id = ?`,
    [now(), transactionId]
  );
}

/**
 * Mark a transaction as rejected with error
 */
export async function markTransactionRejected(transactionId: string, error: string): Promise<void> {
  await exec(
    `UPDATE transactions
     SET sync_status = 'rejected', sync_error = ?
     WHERE id = ?`,
    [error, transactionId]
  );
}

/**
 * Mark multiple transactions as synced (batch operation)
 */
export async function markTransactionsSynced(transactionIds: string[]): Promise<void> {
  if (transactionIds.length === 0) return;

  const placeholders = transactionIds.map(() => '?').join(',');
  const timestamp = now();

  await exec(
    `UPDATE transactions
     SET sync_status = 'synced', synced_at = ?, sync_error = NULL
     WHERE id IN (${placeholders})`,
    [timestamp, ...transactionIds]
  );
}

/**
 * Get rejected transactions for display
 */
export async function getRejectedTransactions(distributionCenterId: string): Promise<Transaction[]> {
  return await query<Transaction>(
    `SELECT * FROM transactions
     WHERE distribution_center_id = ? AND sync_status = 'rejected'
     ORDER BY timestamp DESC`,
    [distributionCenterId]
  );
}
