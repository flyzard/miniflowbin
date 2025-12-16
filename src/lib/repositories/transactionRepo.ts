/**
 * Transaction Repository
 */

import { exec, queryOne } from '../db/database';
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
 * Create a new transaction
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

  return (await getTransactionById(id))!;
}
