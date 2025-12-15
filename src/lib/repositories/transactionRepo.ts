/**
 * Transaction Repository
 */

import { exec, query, queryOne } from '../db/database';
import type { Transaction, TransactionType } from '../types';
import { generateId, now } from '../types';

/**
 * Get a transaction by ID
 */
export function getTransactionById(id: string): Transaction | null {
  return queryOne<Transaction>(
    'SELECT * FROM transactions WHERE id = ?',
    [id]
  );
}

/**
 * Create a new transaction
 */
export function createTransaction(data: {
  type: TransactionType;
  productId: string;
  batchId?: string;
  fromPositionId?: string;
  toPositionId?: string;
  quantity: number;
  userId: string;
  distributionCenterId: string;
  notes?: string;
}): Transaction {
  const id = generateId();
  const timestamp = now();

  exec(
    `INSERT INTO transactions
     (id, type, product_id, batch_id, from_position_id, to_position_id, quantity, timestamp, user_id, distribution_center_id, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  return getTransactionById(id)!;
}

/**
 * List recent transactions for a distribution center
 */
export function listRecentTransactions(
  distributionCenterId: string,
  limit: number = 50
): Transaction[] {
  return query<Transaction>(
    'SELECT * FROM transactions WHERE distribution_center_id = ? ORDER BY timestamp DESC LIMIT ?',
    [distributionCenterId, limit]
  );
}

/**
 * List transactions by type
 */
export function listTransactionsByType(
  type: TransactionType,
  distributionCenterId: string,
  limit: number = 50
): Transaction[] {
  return query<Transaction>(
    'SELECT * FROM transactions WHERE type = ? AND distribution_center_id = ? ORDER BY timestamp DESC LIMIT ?',
    [type, distributionCenterId, limit]
  );
}

/**
 * List transactions for a product
 */
export function listTransactionsForProduct(
  productId: string,
  limit: number = 50
): Transaction[] {
  return query<Transaction>(
    'SELECT * FROM transactions WHERE product_id = ? ORDER BY timestamp DESC LIMIT ?',
    [productId, limit]
  );
}

/**
 * List transactions for a batch
 */
export function listTransactionsForBatch(batchId: string): Transaction[] {
  return query<Transaction>(
    'SELECT * FROM transactions WHERE batch_id = ? ORDER BY timestamp DESC',
    [batchId]
  );
}

/**
 * List transactions by user
 */
export function listTransactionsByUser(
  userId: string,
  limit: number = 50
): Transaction[] {
  return query<Transaction>(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
    [userId, limit]
  );
}

/**
 * Get transaction count by type for today
 */
export function getTodayTransactionCount(
  type: TransactionType,
  distributionCenterId: string
): number {
  const today = new Date().toISOString().split('T')[0] ?? '';
  const result = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions
     WHERE type = ? AND distribution_center_id = ? AND DATE(timestamp) = ?`,
    [type as string, distributionCenterId, today]
  );
  return result?.count ?? 0;
}
