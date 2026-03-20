import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import Anthropic from '@anthropic-ai/sdk';
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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Upload and parse receipt
app.post('/api/receipts/upload', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const imagePath = req.file.path;
    const imageData = readFileSync(imagePath).toString('base64');
    const mimeType = req.file.mimetype;

    // Extract receipt data using Claude vision
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageData,
              },
            },
            {
              type: 'text',
              text: `Analyze this grocery receipt image and extract all information. Return ONLY valid JSON with this exact structure:
{
  "store_name": "Store name or 'Unknown Store' if not found",
  "purchase_date": "YYYY-MM-DD format or null if not found",
  "total_price": numeric total price as a number (no currency symbols), or null if not found,
  "items": [
    {
      "name": "item name",
      "category": "category like Produce, Dairy, Meat, Bakery, Beverages, Snacks, Household, Frozen, Canned, Personal Care, or Other",
      "quantity": "quantity as string e.g. '1', '2 lbs', '3 x $1.99'",
      "price": numeric price as a number (no currency symbols)
    }
  ]
}
Extract every line item visible on the receipt. If something is unclear, make your best guess. Return only the JSON object, no explanation.`,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((b) => b.type === 'text');
    if (!textContent) {
      throw new Error('No text response from Claude');
    }

    // Parse the JSON response
    let extracted;
    try {
      const jsonText = textContent.text.trim().replace(/^```json\s*|\s*```$/g, '');
      extracted = JSON.parse(jsonText);
    } catch {
      throw new Error('Failed to parse Claude response as JSON');
    }

    // Validate and sanitize
    const storeName = extracted.store_name || 'Unknown Store';
    const purchaseDate = extracted.purchase_date || null;
    const totalPrice = typeof extracted.total_price === 'number' ? extracted.total_price : null;
    const items = Array.isArray(extracted.items) ? extracted.items : [];

    // Save to database in a transaction
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
