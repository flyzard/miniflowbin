/**
 * Debug utilities for inspecting database content
 * Usage: Import in main.ts and expose to window for console access
 */

import { query, queryOne, exec, transaction } from './database';

// Re-export raw database functions for direct console access
export { query, queryOne, exec, transaction };
import type { Transaction } from '../types';

export const dbDebug = {
  /**
   * Get all transactions
   */
  async getTransactions() {
    return await query<Transaction>('SELECT * FROM transactions ORDER BY timestamp DESC');
  },

  /**
   * Get all products
   */
  async getProducts() {
    return await query('SELECT * FROM products ORDER BY name');
  },

  /**
   * Get all batches
   */
  async getBatches() {
    return await query('SELECT * FROM batches ORDER BY batch_number');
  },

  /**
   * Get all positions
   */
  async getPositions() {
    return await query('SELECT * FROM positions ORDER BY name');
  },

  /**
   * Get all distribution centers
   */
  async getDistributionCenters() {
    return await query('SELECT * FROM distribution_centers');
  },

  /**
   * Get all settings
   */
  async getSettings() {
    return await query('SELECT * FROM settings');
  },

  /**
   * Run custom SQL query
   */
  async runQuery(sql: string, params?: unknown[]) {
    return await query(sql, params);
  },

  /**
   * Get database stats
   */
  async getStats() {
    const tables = ['transactions', 'products', 'batches', 'positions', 'distribution_centers', 'settings'];
    const stats: Record<string, number> = {};
    
    for (const table of tables) {
      const result = await query<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
      stats[table] = result[0]?.count ?? 0;
    }
    
    return stats;
  }
};
