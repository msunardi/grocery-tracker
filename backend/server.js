import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { ocrSpace } from 'ocr-space-api-wrapper';
import {
  insertReceipt,
  insertItem,
  getAllReceipts,
  getReceiptById,
  getItemsByReceiptId,
  deleteReceiptById,
  getAnalytics,
  getSpendingByCategory,
  getSpendingByStore,
} from './database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

// Ensure uploads directory exists
const uploadsDir = join(__dirname, 'uploads');
mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'receipt-' + uniqueSuffix + extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

function categorizeItem(name) {
  const n = name.toLowerCase();
  if (/milk|cheese|yogurt|butter|cream|dairy|egg/.test(n)) return 'Dairy';
  if (/apple|banana|orange|berry|grape|lettuce|spinach|tomato|onion|potato|carrot|pepper|cucumber|broccoli|celery|fruit|vegetable|produce/.test(n)) return 'Produce';
  if (/chicken|beef|pork|fish|salmon|shrimp|turkey|meat|steak|ground/.test(n)) return 'Meat';
  if (/bread|bagel|muffin|cake|cookie|pastry|donut|bakery|roll|bun/.test(n)) return 'Bakery';
  if (/water|juice|soda|coffee|tea|drink|beverage|beer|wine/.test(n)) return 'Beverages';
  if (/chip|cracker|candy|chocolate|snack|pretzel|popcorn|nut/.test(n)) return 'Snacks';
  if (/soap|shampoo|toothpaste|deodorant|lotion|razor|personal/.test(n)) return 'Personal Care';
  if (/detergent|cleaner|paper|towel|trash|tissue|napkin|foil|wrap|household/.test(n)) return 'Household';
  if (/frozen|ice cream|pizza/.test(n)) return 'Frozen';
  if (/\bcan\b|canned|soup|beans|corn|peas/.test(n)) return 'Canned';
  return 'Other';
}

function parseReceiptText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Store name: first non-empty line
  const store_name = lines[0] || 'Unknown Store';

  // Date: scan all lines for common date formats
  let purchase_date = null;
  for (const line of lines) {
    let m = line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (m) { purchase_date = `${m[1]}-${m[2]}-${m[3]}`; break; }
    m = line.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (m) { purchase_date = `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; break; }
    m = line.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2})\b/);
    if (m) {
      const year = parseInt(m[3]) > 50 ? `19${m[3]}` : `20${m[3]}`;
      purchase_date = `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
      break;
    }
    m = line.match(/\b(\d{1,2})-(\d{1,2})-(\d{4})\b/);
    if (m) { purchase_date = `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; break; }
  }

  // Total: find line containing a "total" keyword, extract last price on that line
  let total_price = null;
  const totalRe = /\b(grand\s+total|total\s+due|amount\s+due|balance\s+due|total)\b/i;
  for (const line of lines) {
    if (totalRe.test(line)) {
      const prices = [...line.matchAll(/\$?(\d+\.\d{2})/g)];
      if (prices.length) {
        total_price = parseFloat(prices[prices.length - 1][1]);
        break;
      }
    }
  }

  // Items: lines that end with a price and aren't metadata
  const skipRe = /\b(subtotal|sub-total|tax|total|change|cash|credit|debit|visa|mastercard|thank|receipt|store|phone|address|www\.|http|savings|member|loyalty|coupon|balance|due)\b/i;
  const itemRe = /^(.+?)\s{2,}\$?(\d+\.\d{2})\s*[A-Z*]?\s*$/;
  const shortItemRe = /^(.+?)\s+\$?(\d+\.\d{2})\s*[A-Z*]?\s*$/;

  const items = [];
  for (const line of lines.slice(1)) {
    if (skipRe.test(line)) continue;
    const m = itemRe.exec(line) || shortItemRe.exec(line);
    if (m) {
      const name = m[1].replace(/\s+/g, ' ').trim();
      const price = parseFloat(m[2]);
      if (name.length >= 2 && name.length <= 60 && !/^\d+$/.test(name)) {
        items.push({ name, category: categorizeItem(name), quantity: '1', price });
      }
    }
  }

  return { store_name, purchase_date, total_price, items };
}

// Upload and parse receipt
app.post('/api/receipts/upload', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const imagePath = req.file.path;

    // Extract text from receipt image using OCR.space
    const ocrResult = await ocrSpace(imagePath, {
      apiKey: process.env.OCR_SPACE_API_KEY,
      language: 'eng',
      OCREngine: 2,
    });

    if (ocrResult.IsErroredOnProcessing || !ocrResult.ParsedResults?.length) {
      throw new Error('OCR processing failed: ' + (ocrResult.ErrorMessage?.[0] || 'Unknown error'));
    }

    const ocrText = ocrResult.ParsedResults[0].ParsedText;
    if (!ocrText?.trim()) {
      throw new Error('No text extracted from receipt image');
    }

    // Parse OCR text into structured data
    const extracted = parseReceiptText(ocrText);

    const storeName = extracted.store_name || 'Unknown Store';
    const purchaseDate = extracted.purchase_date || null;
    const totalPrice = typeof extracted.total_price === 'number' ? extracted.total_price : null;
    const items = Array.isArray(extracted.items) ? extracted.items : [];

    // Save to database
    const saveReceipt = (() => {
      const receipt = insertReceipt.run({
        store_name: storeName,
        purchase_date: purchaseDate,
        total_price: totalPrice,
        image_path: req.file.filename,
      });

      const receiptId = receipt.lastInsertRowid;

      for (const item of items) {
        insertItem.run({
          receipt_id: receiptId,
          name: item.name || 'Unknown Item',
          category: item.category || 'Other',
          quantity: item.quantity ? String(item.quantity) : null,
          price: typeof item.price === 'number' ? item.price : null,
        });
      }

      return receiptId;
    })();

    const savedReceipt = getReceiptById.get(saveReceipt);
    const savedItems = getItemsByReceiptId.all(saveReceipt);

    res.json({
      success: true,
      receipt: savedReceipt,
      items: savedItems,
    });
  } catch (error) {
    console.error('Error processing receipt:', error);
    res.status(500).json({ error: error.message || 'Failed to process receipt' });
  }
});

// Get all receipts
app.get('/api/receipts', (req, res) => {
  const receipts = getAllReceipts.all();
  res.json(receipts);
});

// Get a single receipt with items
app.get('/api/receipts/:id', (req, res) => {
  const receipt = getReceiptById.get(req.params.id);
  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found' });
  }
  const items = getItemsByReceiptId.all(req.params.id);
  res.json({ receipt, items });
});

// Delete a receipt
app.delete('/api/receipts/:id', (req, res) => {
  const receipt = getReceiptById.get(req.params.id);
  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found' });
  }
  deleteReceiptById.run(req.params.id);
  res.json({ success: true });
});

// Analytics endpoint
app.get('/api/analytics', (req, res) => {
  const overview = getAnalytics.get();
  const byCategory = getSpendingByCategory.all();
  const byStore = getSpendingByStore.all();
  res.json({ overview, byCategory, byStore });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
