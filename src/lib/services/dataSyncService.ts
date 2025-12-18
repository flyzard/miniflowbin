/**
 * Data Sync Service
 *
 * Handles bidirectional sync:
 * - Sync DOWN: Download products, positions, and inventory batches from server
 * - Sync UP: Upload local transactions to server
 *
 * Called after login and on app startup when authenticated + online.
 *
 * Sections:
 * 1. DATA SYNC DOWN (Server → Local) - fetchAndSyncData, syncToDatabase
 * 2. TRANSACTION UPLOAD (Local → Server) - uploadPendingTransactions, tryImmediateUpload
 * 3. INVENTORY BATCH SYNC - syncInventoryBatches
 */

import { getDecryptedDeviceToken } from '../auth/deviceService';
import { getPrimaryAuthUser } from '../auth/authRepository';
import { transaction } from '../db/database';
import * as settingsRepo from '../repositories/settingsRepo';
import * as productRepo from '../repositories/productRepo';
import * as positionRepo from '../repositories/positionRepo';
import * as batchRepo from '../repositories/batchRepo';
import * as transactionRepo from '../repositories/transactionRepo';
import type {
  SyncResponse,
  DataSyncResult,
  TransactionUpload,
  TransactionSyncResponse,
  TransactionUploadResult,
  SyncInventoryBatch,
} from '../auth/types';
import { parseApiError } from '../utils/api';
import type { Transaction } from '../types';

const API_BASE = import.meta.env.VITE_FLOWBIN_API_URL || '';

// ============================================================================
// SECTION 1: DATA SYNC DOWN (Server → Local)
// ============================================================================

/**
 * Fetch data from server and sync to local database
 */
export async function fetchAndSyncData(): Promise<DataSyncResult> {
  console.log('[DataSync] Starting sync...');
  console.log('[DataSync] API_BASE:', API_BASE || '(not configured)');

  if (!API_BASE) {
    return { success: false, error: 'API URL not configured' };
  }

  try {
    // Get decrypted device token for API authentication
    console.log('[DataSync] Getting device token...');
    const token = await getDecryptedDeviceToken();
    console.log('[DataSync] Token available:', !!token);

    if (!token) {
      return { success: false, error: 'No authentication token available' };
    }

    console.log('[DataSync] Fetching data from server...');
    console.log('[DataSync] URL:', `${API_BASE}/sync`);

    // Call /api/sync endpoint
    const response = await fetch(`${API_BASE}/sync`, {
      method: 'GET',
      headers: {
        'X-Device-Token': token,
        'Accept': 'application/json',
      },
    });

    console.log('[DataSync] Response status:', response.status);

    if (!response.ok) {
      const errorData = await parseApiError(response);
      console.error('[DataSync] Server error:', errorData);
      return { success: false, error: errorData.message };
    }

    const data: SyncResponse = await response.json();
    console.log('[DataSync] Response data:', JSON.stringify(data, null, 2));

    if (!data.success) {
      return { success: false, error: 'Sync failed: server returned unsuccessful response' };
    }

    console.log('[DataSync] Received data:', {
      distributionCenter: data.distribution_center.name,
      products: data.products.length,
      positions: data.storage_positions.length
    });

    // Sync data to local database within a transaction
    await syncToDatabase(data);

    console.log('[DataSync] Data sync complete');

    return {
      success: true,
      productCount: data.products.length,
      positionCount: data.storage_positions.length
    };

  } catch (error) {
    console.error('[DataSync] Sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error. Please check your connection.'
    };
  }
}

/**
 * Sync data to local database
 */
async function syncToDatabase(data: SyncResponse): Promise<void> {
  const dcId = String(data.distribution_center.id);

  await transaction(async () => {
    // 1. Upsert distribution center
    await settingsRepo.upsertDistributionCenter({
      id: dcId,
      code: data.distribution_center.code,
      name: data.distribution_center.name,
      address: data.distribution_center.address,
      timezone: data.distribution_center.timezone,
    });

    // 2. Deactivate all products, then upsert from server
    // (Soft delete preserves FK relationships with transactions)
    await productRepo.deactivateProductsForDc(dcId);
    if (data.products.length > 0) {
      await productRepo.upsertProducts(
        data.products.map(p => ({
          id: String(p.id),
          sku: p.sku,
          name: p.name,
          description: p.description,
          category: p.category,
          color: p.color,
          size: p.size,
          unit_of_measure: p.unit_of_measure,
          distribution_center_id: dcId,
        }))
      );
    }

    // 3. Deactivate all positions, then upsert from server
    // (Soft delete preserves FK relationships with batches/transactions)
    await positionRepo.deactivatePositionsForDc(dcId);
    if (data.storage_positions.length > 0) {
      await positionRepo.upsertPositions(
        data.storage_positions.map(p => ({
          id: String(p.id),
          code: p.code,
          zone: p.zone,
          zone_type: p.zone_type,
          description: p.description,
          aisle: p.aisle,
          rack: p.rack,
          level: p.level,
          distribution_center_id: dcId,
        }))
      );
    }

    // 4. Set selected distribution center
    await settingsRepo.setSelectedDcId(dcId);

    // 5. Sync inventory batches if provided
    if (data.inventory_batches && data.inventory_batches.length > 0) {
      await syncInventoryBatchesInternal(data.inventory_batches, dcId);
    }
  });
}

// ============================================================================
// SECTION 2: TRANSACTION UPLOAD (Local → Server)
// ============================================================================

/**
 * Upload pending transactions to server
 */
export async function uploadPendingTransactions(
  distributionCenterId: string
): Promise<TransactionUploadResult> {
  console.log('[DataSync] Uploading pending transactions...');

  if (!API_BASE) {
    return { success: false, error: 'API URL not configured' };
  }

  try {
    const token = await getDecryptedDeviceToken();
    if (!token) {
      return { success: false, error: 'No authentication token available' };
    }

    // Get pending transactions
    const pendingTxns = await transactionRepo.getPendingTransactions(distributionCenterId);

    if (pendingTxns.length === 0) {
      console.log('[DataSync] No pending transactions to upload');
      return { success: true, syncedCount: 0, rejectedCount: 0 };
    }

    console.log(`[DataSync] Found ${pendingTxns.length} pending transactions`);

    // Build upload payload with batch_number correlation
    const uploadPayload = await buildTransactionUploadPayload(pendingTxns);

    // Call upload endpoint
    const response = await fetch(`${API_BASE}/sync/transactions`, {
      method: 'POST',
      headers: {
        'X-Device-Token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ transactions: uploadPayload }),
    });

    if (!response.ok) {
      const errorData = await parseApiError(response);
      console.error('[DataSync] Upload failed:', errorData);
      return { success: false, error: errorData.message };
    }

    const result: TransactionSyncResponse = await response.json();
    console.log('[DataSync] Upload response:', {
      synced: result.synced_count,
      rejected: result.rejected_transactions.length
    });

    // Process results - mark synced/rejected transactions
    await processUploadResults(pendingTxns, result);

    return {
      success: true,
      syncedCount: result.synced_count,
      rejectedCount: result.rejected_transactions.length,
    };

  } catch (error) {
    console.error('[DataSync] Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error during upload'
    };
  }
}

/**
 * Build upload payload from local transactions
 */
async function buildTransactionUploadPayload(txns: Transaction[]): Promise<TransactionUpload[]> {
  const payload: TransactionUpload[] = [];

  // Get auth user to map local user_id to remote_user_id
  const authUser = await getPrimaryAuthUser();
  if (!authUser?.remote_user_id) {
    throw new Error('No authenticated user with remote ID');
  }

  for (const txn of txns) {
    // Get batch_number for correlation
    const batch = txn.batch_id ? await batchRepo.getBatchById(txn.batch_id) : null;

    payload.push({
      local_id: txn.id,
      type: txn.type as 'RECEIVE' | 'RELEASE',
      batch_number: batch?.batch_number ?? '',
      product_id: parseInt(txn.product_id, 10),
      from_position_id: txn.from_position_id ? parseInt(txn.from_position_id, 10) : undefined,
      to_position_id: txn.to_position_id ? parseInt(txn.to_position_id, 10) : undefined,
      quantity: txn.quantity,
      timestamp: txn.timestamp,
      user_id: authUser.remote_user_id,
      distribution_center_id: parseInt(txn.distribution_center_id, 10),
      notes: txn.notes ?? undefined,
      lot_number: batch?.lot_number ?? undefined,
      expiration_date: batch?.expiration_date ?? undefined,
    });
  }

  return payload;
}

/**
 * Process upload results - mark transactions as synced or rejected
 */
async function processUploadResults(
  localTxns: Transaction[],
  serverResponse: TransactionSyncResponse
): Promise<void> {
  const rejectedIds = new Set(serverResponse.rejected_transactions.map(r => r.local_id));

  await transaction(async () => {
    // Mark rejected transactions
    for (const rejected of serverResponse.rejected_transactions) {
      await transactionRepo.markTransactionRejected(rejected.local_id, rejected.error);
    }

    // Mark remaining as synced
    const syncedIds = localTxns
      .filter(t => !rejectedIds.has(t.id))
      .map(t => t.id);

    await transactionRepo.markTransactionsSynced(syncedIds);
  });
}

/**
 * Try to upload a single transaction immediately (fire-and-forget with fallback)
 * Returns true if uploaded, false if queued for later
 */
export async function tryImmediateUpload(transactionId: string): Promise<boolean> {
  if (!navigator.onLine) {
    console.log('[DataSync] Offline - transaction queued');
    return false;
  }

  if (!API_BASE) {
    console.log('[DataSync] No API URL - transaction queued');
    return false;
  }

  try {
    const txn = await transactionRepo.getTransactionById(transactionId);
    if (!txn || txn.sync_status !== 'pending') {
      return false;
    }

    const token = await getDecryptedDeviceToken();
    if (!token) {
      return false;
    }

    // Get auth user for remote_user_id
    const authUser = await getPrimaryAuthUser();
    if (!authUser?.remote_user_id) {
      console.warn('[DataSync] No remote user ID available');
      return false;
    }

    const batch = txn.batch_id ? await batchRepo.getBatchById(txn.batch_id) : null;

    const payload: TransactionUpload = {
      local_id: txn.id,
      type: txn.type as 'RECEIVE' | 'RELEASE',
      batch_number: batch?.batch_number ?? '',
      product_id: parseInt(txn.product_id, 10),
      from_position_id: txn.from_position_id ? parseInt(txn.from_position_id, 10) : undefined,
      to_position_id: txn.to_position_id ? parseInt(txn.to_position_id, 10) : undefined,
      quantity: txn.quantity,
      timestamp: txn.timestamp,
      user_id: authUser.remote_user_id,
      distribution_center_id: parseInt(txn.distribution_center_id, 10),
      notes: txn.notes ?? undefined,
      lot_number: batch?.lot_number ?? undefined,
      expiration_date: batch?.expiration_date ?? undefined,
    };

    const response = await fetch(`${API_BASE}/sync/transactions`, {
      method: 'POST',
      headers: {
        'X-Device-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transactions: [payload] }),
    });

    if (!response.ok) {
      console.warn('[DataSync] Immediate upload failed, queued for later');
      return false;
    }

    const result: TransactionSyncResponse = await response.json();

    const rejection = result.rejected_transactions[0];
    if (rejection) {
      await transactionRepo.markTransactionRejected(txn.id, rejection.error);
    } else {
      await transactionRepo.markTransactionSynced(txn.id);
    }

    console.log('[DataSync] Immediate upload successful');
    return true;

  } catch (error) {
    console.warn('[DataSync] Immediate upload error, queued:', error);
    return false;
  }
}

// ============================================================================
// SECTION 3: INVENTORY BATCH SYNC
// ============================================================================

/**
 * Sync inventory batches from server
 * Replaces local batches with server state
 */
export async function syncInventoryBatches(
  batches: SyncInventoryBatch[],
  distributionCenterId: string
): Promise<void> {
  await syncInventoryBatchesInternal(batches, distributionCenterId);
}

/**
 * Internal function to sync inventory batches within a transaction
 */
async function syncInventoryBatchesInternal(
  batches: SyncInventoryBatch[],
  distributionCenterId: string
): Promise<void> {
  // Get the local user ID to use for received_by (server user IDs don't exist locally)
  const localUser = await getPrimaryAuthUser();
  if (!localUser) {
    console.warn('[DataSync] No local user found, skipping batch sync');
    return;
  }
  const localUserId = localUser.id;

  // Deactivate existing batches (soft delete preserves FK relationships)
  await batchRepo.deactivateBatchesForDc(distributionCenterId);

  // Upsert batches from server (insert or update, marking as active)
  if (batches.length > 0) {
    await batchRepo.upsertBatches(
      batches.map(b => ({
        id: String(b.id),
        batchNumber: b.batch_number,
        productId: String(b.product_id),
        positionId: String(b.position_id),
        quantity: b.quantity,
        originalQuantity: b.original_quantity,
        receivedAt: b.received_at,
        receivedBy: localUserId, // Use local user ID (server user IDs don't exist locally)
        distributionCenterId: distributionCenterId,
        expirationDate: b.expiration_date,
        lotNumber: b.lot_number,
      }))
    );
  }

  console.log(`[DataSync] Synced ${batches.length} inventory batches`);
}
