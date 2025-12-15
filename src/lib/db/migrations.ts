/**
 * Database Migrations System
 *
 * Handles schema versioning and data seeding
 */

import { exec, query, queryOne, transaction } from './database';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';
import { generateId, now } from '../types';

interface SchemaVersion {
  version: number;
  applied_at: string;
}

/**
 * Get the current schema version from the database
 */
function getCurrentVersion(): number {
  try {
    const result = queryOne<SchemaVersion>(
      'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
    );
    return result?.version ?? 0;
  } catch {
    // Table doesn't exist yet
    return 0;
  }
}

/**
 * Record a migration version
 */
function recordVersion(version: number): void {
  exec(
    'INSERT INTO schema_version (version, applied_at) VALUES (?, ?)',
    [version, now()]
  );
}

/**
 * Run all pending migrations
 */
export function runMigrations(): void {
  const currentVersion = getCurrentVersion();
  console.log(`[Migrations] Current schema version: ${currentVersion}`);

  if (currentVersion < SCHEMA_VERSION) {
    console.log(`[Migrations] Upgrading to version ${SCHEMA_VERSION}...`);

    transaction(() => {
      // Run the schema creation SQL
      exec(CREATE_TABLES_SQL);
      recordVersion(SCHEMA_VERSION);
    });

    console.log('[Migrations] Schema upgrade complete');
  } else {
    console.log('[Migrations] Schema is up to date');
  }
}

/**
 * Seed the database with sample data for development/demo
 */
export function seedDatabase(): void {
  console.log('[Seed] Checking if seed data needed...');

  // Check if data already exists
  const dcCount = queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM distribution_centers'
  );

  if (dcCount && dcCount.count > 0) {
    console.log('[Seed] Data already exists, skipping seed');
    return;
  }

  console.log('[Seed] Seeding database with sample data...');

  transaction(() => {
    const timestamp = now();

    // Create distribution center
    const dcId = generateId();
    exec(
      `INSERT INTO distribution_centers (id, code, name, address, timezone, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [dcId, 'MDC', 'Main Distribution Center', '123 Warehouse Ave, Industrial Park', 'America/New_York', 1, timestamp, timestamp]
    );

    // Create users
    const userId = generateId();
    exec(
      `INSERT INTO users (id, username, display_name, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, 'carlos', 'Carlos Martinez', 'ASSOCIATE', 1, timestamp, timestamp]
    );

    const clerkId = generateId();
    exec(
      `INSERT INTO users (id, username, display_name, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [clerkId, 'maria', 'Maria Santos', 'CLERK', 1, timestamp, timestamp]
    );

    // Create products
    const products = [
      { sku: 'ELEC-001', name: 'Wireless Bluetooth Headphones', category: 'Electronics', uom: 'EA' },
      { sku: 'ELEC-002', name: 'USB-C Charging Cable 6ft', category: 'Electronics', uom: 'EA' },
      { sku: 'ELEC-003', name: 'Portable Power Bank 10000mAh', category: 'Electronics', uom: 'EA' },
      { sku: 'FOOD-001', name: 'Organic Coffee Beans 1lb', category: 'Food & Beverage', uom: 'EA' },
      { sku: 'FOOD-002', name: 'Sparkling Water 12-Pack', category: 'Food & Beverage', uom: 'CS' },
      { sku: 'FOOD-003', name: 'Protein Bars Variety Pack', category: 'Food & Beverage', uom: 'BX' },
      { sku: 'OFFC-001', name: 'Copy Paper A4 500 Sheets', category: 'Office Supplies', uom: 'PK' },
      { sku: 'OFFC-002', name: 'Ballpoint Pens Blue 12-Pack', category: 'Office Supplies', uom: 'PK' },
      { sku: 'OFFC-003', name: 'Sticky Notes 3x3 Yellow', category: 'Office Supplies', uom: 'PK' },
      { sku: 'TOOL-001', name: 'Cordless Drill 20V', category: 'Tools', uom: 'EA' },
      { sku: 'TOOL-002', name: 'Screwdriver Set 32-Piece', category: 'Tools', uom: 'ST' },
      { sku: 'TOOL-003', name: 'Safety Glasses Clear', category: 'Tools', uom: 'EA' },
      { sku: 'CLTH-001', name: 'Work Gloves Heavy Duty', category: 'Clothing', uom: 'PR' },
      { sku: 'CLTH-002', name: 'High-Vis Safety Vest', category: 'Clothing', uom: 'EA' },
      { sku: 'CLTH-003', name: 'Steel Toe Work Boots', category: 'Clothing', uom: 'PR' },
      { sku: 'PACK-001', name: 'Cardboard Boxes 12x12x12', category: 'Packaging', uom: 'EA' },
      { sku: 'PACK-002', name: 'Packing Tape 2in x 100yd', category: 'Packaging', uom: 'RL' },
      { sku: 'PACK-003', name: 'Bubble Wrap 12in x 100ft', category: 'Packaging', uom: 'RL' },
      { sku: 'CHEM-001', name: 'All-Purpose Cleaner 1gal', category: 'Cleaning', uom: 'EA' },
      { sku: 'CHEM-002', name: 'Hand Sanitizer 16oz', category: 'Cleaning', uom: 'EA' },
    ];

    const productIds: string[] = [];
    for (const p of products) {
      const id = generateId();
      productIds.push(id);
      exec(
        `INSERT INTO products (id, sku, name, description, category, unit_of_measure, distribution_center_id, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, p.sku, p.name, null, p.category, p.uom, dcId, 1, timestamp, timestamp]
      );
    }

    // Create storage positions
    const zones = [
      { zone: 'Zone A', type: 'General Storage', aisles: ['A1', 'A2', 'A3'] },
      { zone: 'Zone B', type: 'General Storage', aisles: ['B1', 'B2'] },
      { zone: 'Zone C', type: 'Refrigerated', aisles: ['C1'] },
      { zone: 'Receiving', type: 'Receiving', aisles: ['RCV'] },
      { zone: 'Shipping', type: 'Shipping', aisles: ['SHP'] },
    ];

    const positionIds: string[] = [];
    for (const z of zones) {
      for (const aisle of z.aisles) {
        for (let rack = 1; rack <= 3; rack++) {
          for (let level = 1; level <= 4; level++) {
            const code = `${aisle}-${String(rack).padStart(2, '0')}-${level}`;
            const id = generateId();
            positionIds.push(id);
            exec(
              `INSERT INTO storage_positions (id, code, zone, zone_type, description, aisle, rack, level, distribution_center_id, is_active, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [id, code, z.zone, z.type, null, aisle, String(rack), String(level), dcId, 1, timestamp, timestamp]
            );
          }
        }
      }
    }

    // Create some inventory batches
    const batchData = [
      { productIdx: 0, positionIdx: 0, qty: 50 },  // Headphones in A1-01-1
      { productIdx: 0, positionIdx: 1, qty: 25 },  // Headphones in A1-01-2
      { productIdx: 1, positionIdx: 2, qty: 100 }, // USB cables in A1-01-3
      { productIdx: 2, positionIdx: 4, qty: 30 },  // Power banks in A1-02-1
      { productIdx: 3, positionIdx: 12, qty: 200 }, // Coffee in A2-01-1
      { productIdx: 4, positionIdx: 13, qty: 50 },  // Water in A2-01-2
      { productIdx: 6, positionIdx: 24, qty: 500 }, // Paper in A3-01-1
      { productIdx: 9, positionIdx: 36, qty: 20 },  // Drills in B1-01-1
      { productIdx: 15, positionIdx: 48, qty: 300 }, // Boxes in B2-01-1
    ];

    for (let i = 0; i < batchData.length; i++) {
      const b = batchData[i]!;
      const productId = productIds[b.productIdx];
      const positionId = positionIds[b.positionIdx];

      if (!productId || !positionId) continue;

      const batchId = generateId();
      const batchNumber = `BATCH-20251210-${String(i + 1).padStart(3, '0')}`;
      const receivedAt = '2024-12-10T08:00:00.000Z';

      exec(
        `INSERT INTO inventory_batches (id, batch_number, product_id, position_id, quantity, original_quantity, received_at, received_by, expiration_date, lot_number, distribution_center_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [batchId, batchNumber, productId, positionId, b.qty, b.qty, receivedAt, userId, null, null, dcId, timestamp, timestamp]
      );

      // Create receive transaction
      exec(
        `INSERT INTO transactions (id, type, product_id, batch_id, from_position_id, to_position_id, quantity, timestamp, user_id, distribution_center_id, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [generateId(), 'RECEIVE', productId, batchId, null, positionId, b.qty, receivedAt, userId, dcId, 'Initial inventory seed', timestamp]
      );
    }

    // Store selected DC in settings
    exec(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      ['selected_dc_id', dcId]
    );

    exec(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      ['current_user_id', userId]
    );
  });

  console.log('[Seed] Database seeded successfully');
}

/**
 * Initialize database with schema and optional seed data
 */
export function initializeSchema(shouldSeed: boolean = true): void {
  runMigrations();
  if (shouldSeed) {
    seedDatabase();
  }
}
