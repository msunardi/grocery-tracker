import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'grocery.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_name TEXT NOT NULL,
    purchase_date TEXT,
    total_price REAL,
    image_path TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    quantity TEXT,
    price REAL,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
  );
`);

export const insertReceipt = db.prepare(`
  INSERT INTO receipts (store_name, purchase_date, total_price, image_path)
  VALUES (@store_name, @purchase_date, @total_price, @image_path)
`);

export const insertItem = db.prepare(`
  INSERT INTO items (receipt_id, name, category, quantity, price)
  VALUES (@receipt_id, @name, @category, @quantity, @price)
`);

export const getAllReceipts = db.prepare(`
  SELECT * FROM receipts ORDER BY created_at DESC
`);

export const getReceiptById = db.prepare(`
  SELECT * FROM receipts WHERE id = ?
`);

export const getItemsByReceiptId = db.prepare(`
  SELECT * FROM items WHERE receipt_id = ? ORDER BY id
`);

export const deleteReceiptById = db.prepare(`
  DELETE FROM receipts WHERE id = ?
`);

export const updateReceipt = db.prepare(`
  UPDATE receipts SET store_name = @store_name, purchase_date = @purchase_date, total_price = @total_price WHERE id = @id
`);

export const updateItem = db.prepare(`
  UPDATE items SET name = @name, category = @category, quantity = @quantity, price = @price WHERE id = @id
`);

export const deleteItemById = db.prepare(`
  DELETE FROM items WHERE id = ?
`);

export const getAnalytics = db.prepare(`
  SELECT
    COUNT(*) as total_receipts,
    SUM(total_price) as total_spent,
    AVG(total_price) as avg_per_receipt,
    MIN(total_price) as min_receipt,
    MAX(total_price) as max_receipt
  FROM receipts
`);

export const getSpendingByCategory = db.prepare(`
  SELECT category, SUM(price) as total, COUNT(*) as count
  FROM items
  WHERE category IS NOT NULL AND category != ''
  GROUP BY category
  ORDER BY total DESC
`);

export const getSpendingByStore = db.prepare(`
  SELECT store_name, SUM(total_price) as total, COUNT(*) as visits
  FROM receipts
  GROUP BY store_name
  ORDER BY total DESC
`);

export const getRecentReceipts = db.prepare(`
  SELECT * FROM receipts ORDER BY created_at DESC LIMIT 5
`);

export default db;
