/**
 * Transaction Helper
 *
 * Shared logic for recording transactions with immediate upload attempt.
 */

import { authStore } from '../auth/authStore';
import { tryImmediateUpload } from './dataSyncService';

/**
 * Record a transaction and attempt immediate upload
 *
 * Increments pending count, tries to upload immediately,
 * and decrements count if upload succeeds.
 */
export function recordTransactionWithUpload(transactionId: string): void {
  authStore.incrementPendingTransactionCount();

  tryImmediateUpload(transactionId).then(uploaded => {
    if (uploaded) {
      authStore.decrementPendingTransactionCount();
    }
  });
}
