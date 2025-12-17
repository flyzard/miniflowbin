/**
 * Data Sync Service
 *
 * Handles fetching and syncing warehouse data (products, positions, distribution center)
 * from the server. Called after login and on app startup when authenticated + online.
 */

import { getDecryptedDeviceToken } from '../auth/deviceService';
import { transaction } from '../db/database';
import * as settingsRepo from '../repositories/settingsRepo';
import * as productRepo from '../repositories/productRepo';
import * as positionRepo from '../repositories/positionRepo';
import type { SyncResponse, DataSyncResult, ApiError } from '../auth/types';

const API_BASE = import.meta.env.VITE_FLOWBIN_API_URL || '';

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
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'unknown',
        message: `Server error: ${response.status}`
      }));
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

    // 2. Clear and insert products
    await productRepo.clearProductsForDc(dcId);
    if (data.products.length > 0) {
      await productRepo.insertProducts(
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

    // 3. Clear and insert storage positions
    await positionRepo.clearPositionsForDc(dcId);
    if (data.storage_positions.length > 0) {
      await positionRepo.insertPositions(
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
  });
}
