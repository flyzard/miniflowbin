/**
 * Database Schema Definitions
 * Based on PRD Section 8: Data Model
 */

export const SCHEMA_VERSION = 2;

/**
 * SQL statements to create all tables
 */
export const CREATE_TABLES_SQL = `
-- Distribution Centers
CREATE TABLE IF NOT EXISTS distribution_centers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_distribution_centers_code ON distribution_centers(code);
CREATE INDEX IF NOT EXISTS idx_distribution_centers_active ON distribution_centers(is_active);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ASSOCIATE',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  color TEXT,
  size TEXT,
  unit_of_measure TEXT NOT NULL DEFAULT 'EA',
  distribution_center_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (distribution_center_id) REFERENCES distribution_centers(id),
  UNIQUE(sku, distribution_center_id)
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_dc ON products(distribution_center_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_search ON products(name COLLATE NOCASE, sku COLLATE NOCASE);

-- Storage Positions
CREATE TABLE IF NOT EXISTS storage_positions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  zone TEXT NOT NULL,
  zone_type TEXT,
  description TEXT,
  aisle TEXT,
  rack TEXT,
  level TEXT,
  distribution_center_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (distribution_center_id) REFERENCES distribution_centers(id),
  UNIQUE(code, distribution_center_id)
);

CREATE INDEX IF NOT EXISTS idx_positions_code ON storage_positions(code);
CREATE INDEX IF NOT EXISTS idx_positions_zone ON storage_positions(zone);
CREATE INDEX IF NOT EXISTS idx_positions_dc ON storage_positions(distribution_center_id);
CREATE INDEX IF NOT EXISTS idx_positions_active ON storage_positions(is_active);
CREATE INDEX IF NOT EXISTS idx_positions_search ON storage_positions(code COLLATE NOCASE, zone COLLATE NOCASE);

-- Inventory Batches
CREATE TABLE IF NOT EXISTS inventory_batches (
  id TEXT PRIMARY KEY,
  batch_number TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL,
  position_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  original_quantity INTEGER NOT NULL,
  received_at TEXT NOT NULL,
  received_by TEXT NOT NULL,
  expiration_date TEXT,
  lot_number TEXT,
  distribution_center_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (position_id) REFERENCES storage_positions(id),
  FOREIGN KEY (received_by) REFERENCES users(id),
  FOREIGN KEY (distribution_center_id) REFERENCES distribution_centers(id)
);

CREATE INDEX IF NOT EXISTS idx_batches_number ON inventory_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batches_product ON inventory_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_position ON inventory_batches(position_id);
CREATE INDEX IF NOT EXISTS idx_batches_dc ON inventory_batches(distribution_center_id);
CREATE INDEX IF NOT EXISTS idx_batches_received ON inventory_batches(received_at);
CREATE INDEX IF NOT EXISTS idx_batches_quantity ON inventory_batches(quantity);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  product_id TEXT NOT NULL,
  batch_id TEXT,
  from_position_id TEXT,
  to_position_id TEXT,
  quantity INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  user_id TEXT NOT NULL,
  distribution_center_id TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
  FOREIGN KEY (from_position_id) REFERENCES storage_positions(id),
  FOREIGN KEY (to_position_id) REFERENCES storage_positions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (distribution_center_id) REFERENCES distribution_centers(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_batch ON transactions(batch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_dc ON transactions(distribution_center_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);

-- App Settings (key-value store)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
`;

/**
 * SQL to drop all tables (for testing/reset)
 */
export const DROP_TABLES_SQL = `
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS inventory_batches;
DROP TABLE IF EXISTS storage_positions;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS distribution_centers;
DROP TABLE IF EXISTS app_settings;
DROP TABLE IF EXISTS schema_version;
`;
