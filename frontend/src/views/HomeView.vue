<template>
  <div class="home">
    <!-- Upload Section -->
    <div class="upload-section card">
      <h1 class="section-title">📷 Scan Your Receipt</h1>
      <p class="section-subtitle">Upload a photo of your grocery receipt to automatically extract and track your purchases.</p>

      <!-- Drop Zone / Upload Button -->
      <div
        class="drop-zone"
        :class="{ 'drag-over': isDragging, 'has-file': previewUrl }"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="handleDrop"
        @click="triggerFileInput"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="file-input"
          @change="handleFileSelect"
        />

        <div v-if="!previewUrl" class="drop-content">
          <div class="upload-icon">📤</div>
          <div class="upload-label">UPLOAD RECEIPT</div>
          <div class="upload-hint">Click or drag & drop an image here</div>
          <div class="upload-formats">Supports JPG, PNG, WebP (max 20MB)</div>
        </div>

        <div v-else class="preview-content">
          <img :src="previewUrl" alt="Receipt preview" class="receipt-preview" />
          <div class="preview-overlay">
            <button class="change-btn" @click.stop="triggerFileInput">Change Image</button>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-row" v-if="selectedFile">
        <button
          class="btn btn-primary btn-large"
          :disabled="isProcessing"
          @click="processReceipt"
        >
          <span v-if="isProcessing" class="spinner">⟳</span>
          <span v-else>🔍</span>
          {{ isProcessing ? 'Analyzing Receipt...' : 'Analyze Receipt' }}
        </button>
        <button class="btn btn-secondary" @click="clearFile" :disabled="isProcessing">
          ✕ Clear
        </button>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="error-banner">
        <span>⚠️</span> {{ errorMessage }}
      </div>
    </div>

    <!-- Processing Indicator -->
    <div v-if="isProcessing" class="processing-card card">
      <div class="processing-animation">
        <div class="pulse-ring"></div>
        <div class="pulse-icon">🤖</div>
      </div>
      <h3>AI is reading your receipt...</h3>
      <p>Claude is extracting store info, items, and prices</p>
    </div>

    <!-- Results Section -->
    <div v-if="result" class="results-section">
      <div class="results-header">
        <h2 class="results-title">✅ Receipt Scanned Successfully</h2>
        <router-link to="/history" class="view-history-btn">View All Receipts →</router-link>
      </div>

      <!-- Receipt Card -->
      <div class="receipt-display card">
        <!-- Receipt Header -->
        <div class="receipt-header">
          <div class="store-info">
            <div class="store-name">{{ result.receipt.store_name }}</div>
            <div class="receipt-date" v-if="result.receipt.purchase_date">
              📅 {{ formatDate(result.receipt.purchase_date) }}
            </div>
          </div>
          <div class="receipt-badge">
            <span class="badge badge-green">Saved</span>
          </div>
        </div>

        <div class="receipt-divider">
          <span>Items</span>
        </div>

        <!-- Items Table -->
        <div class="items-table" v-if="result.items.length > 0">
          <div class="table-header">
            <span class="col-name">Item</span>
            <span class="col-category">Category</span>
            <span class="col-qty">Qty</span>
            <span class="col-price">Price</span>
          </div>
          <div
            v-for="item in result.items"
            :key="item.id"
            class="table-row"
          >
            <span class="col-name item-name">{{ item.name }}</span>
            <span class="col-category">
              <span class="badge" :class="getCategoryBadge(item.category)">
                {{ item.category || 'Other' }}
              </span>
            </span>
            <span class="col-qty item-qty">{{ item.quantity || '1' }}</span>
            <span class="col-price item-price">
              {{ item.price != null ? formatPrice(item.price) : '—' }}
            </span>
          </div>
        </div>

        <div v-else class="no-items">No items were detected in this receipt.</div>

        <!-- Total -->
        <div class="receipt-total">
          <span class="total-label">TOTAL</span>
          <span class="total-amount">
            {{ result.receipt.total_price != null ? formatPrice(result.receipt.total_price) : '—' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const fileInput = ref(null);
const selectedFile = ref(null);
const previewUrl = ref(null);
const isDragging = ref(false);
const isProcessing = ref(false);
const errorMessage = ref('');
const result = ref(null);

function triggerFileInput() {
  fileInput.value?.click();
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) setFile(file);
}

function handleDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    setFile(file);
  } else {
    errorMessage.value = 'Please drop an image file.';
  }
}

function setFile(file) {
  selectedFile.value = file;
  errorMessage.value = '';
  result.value = null;
  const reader = new FileReader();
  reader.onload = (e) => { previewUrl.value = e.target.result; };
  reader.readAsDataURL(file);
}

function clearFile() {
  selectedFile.value = null;
  previewUrl.value = null;
  errorMessage.value = '';
  result.value = null;
  if (fileInput.value) fileInput.value.value = '';
}

async function processReceipt() {
  if (!selectedFile.value) return;
  isProcessing.value = true;
  errorMessage.value = '';
  result.value = null;

  try {
    const formData = new FormData();
    formData.append('receipt', selectedFile.value);

    const response = await axios.post('/api/receipts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    result.value = response.data;
  } catch (err) {
    errorMessage.value = err.response?.data?.error || 'Failed to process receipt. Please try again.';
  } finally {
    isProcessing.value = false;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatPrice(price) {
  return '$' + Number(price).toFixed(2);
}

const categoryColors = {
  'Produce': 'badge-green',
  'Dairy': 'badge-blue',
  'Meat': 'badge-red',
  'Bakery': 'badge-yellow',
  'Beverages': 'badge-blue',
  'Snacks': 'badge-yellow',
  'Household': 'badge-gray',
  'Frozen': 'badge-blue',
  'Canned': 'badge-gray',
  'Personal Care': 'badge-purple',
};

function getCategoryBadge(category) {
  return categoryColors[category] || 'badge-gray';
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.upload-section {
  text-align: center;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1b4332;
  margin-bottom: 0.5rem;
}

.section-subtitle {
  color: #6b7280;
  font-size: 0.95rem;
  margin-bottom: 1.75rem;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.drop-zone {
  border: 3px dashed #d1fae5;
  border-radius: 20px;
  background: #f0fdf4;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  max-width: 600px;
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: #2d6a4f;
  background: #ecfdf5;
  transform: scale(1.01);
}

.drop-zone.has-file {
  border-style: solid;
  border-color: #2d6a4f;
  min-height: 300px;
}

.file-input {
  display: none;
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem;
}

.upload-icon {
  font-size: 4rem;
  line-height: 1;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.upload-label {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1b4332;
  letter-spacing: 1px;
}

.upload-hint {
  color: #4b5563;
  font-size: 0.95rem;
}

.upload-formats {
  color: #9ca3af;
  font-size: 0.8rem;
}

.preview-content {
  width: 100%;
  height: 100%;
  position: relative;
}

.receipt-preview {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  display: block;
  padding: 0.5rem;
}

.preview-overlay {
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
}

.change-btn {
  background: rgba(0,0,0,0.7);
  color: white;
  border: none;
  padding: 0.4rem 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: background 0.2s;
}

.change-btn:hover { background: rgba(0,0,0,0.9); }

.action-row {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.5rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #2d6a4f, #1b4332);
  color: white;
  box-shadow: 0 4px 12px rgba(27,67,50,0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(27,67,50,0.4);
}

.btn-large {
  padding: 0.85rem 2rem;
  font-size: 1.05rem;
}

.btn-secondary {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.btn-secondary:hover:not(:disabled) { background: #e5e7eb; }

.spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.error-banner {
  background: #fee2e2;
  color: #991b1b;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  margin-top: 1rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Processing Card */
.processing-card {
  text-align: center;
  padding: 2.5rem;
}

.processing-animation {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 1rem;
}

.pulse-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid #2d6a4f;
  animation: pulse 1.5s ease-out infinite;
}

.pulse-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

.processing-card h3 {
  font-size: 1.2rem;
  color: #1b4332;
  margin-bottom: 0.4rem;
}

.processing-card p { color: #6b7280; font-size: 0.9rem; }

/* Results */
.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.results-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1b4332;
}

.view-history-btn {
  color: #2d6a4f;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
}

.view-history-btn:hover { text-decoration: underline; }

/* Receipt Display */
.receipt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.store-name {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1a202c;
  margin-bottom: 0.25rem;
}

.receipt-date {
  color: #6b7280;
  font-size: 0.9rem;
}

.receipt-divider {
  border-top: 2px dashed #e5e7eb;
  text-align: center;
  position: relative;
  margin: 1.25rem 0;
}

.receipt-divider span {
  background: white;
  position: absolute;
  top: -0.65rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0 0.75rem;
  color: #9ca3af;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.items-table {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.table-header, .table-row {
  display: grid;
  grid-template-columns: 1fr 120px 80px 80px;
  gap: 0.5rem;
  padding: 0.6rem 0.5rem;
  align-items: center;
}

.table-header {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
  font-weight: 600;
  border-bottom: 1px solid #f3f4f6;
}

.table-row {
  border-bottom: 1px solid #f9fafb;
  transition: background 0.15s;
}

.table-row:hover { background: #f9fafb; }

.item-name {
  font-weight: 500;
  color: #1a202c;
}

.item-qty {
  color: #6b7280;
  font-size: 0.9rem;
}

.item-price {
  text-align: right;
  font-weight: 600;
  color: #1a202c;
}

.col-price { text-align: right; }

.no-items {
  text-align: center;
  color: #9ca3af;
  padding: 1.5rem;
  font-style: italic;
}

.receipt-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 2px solid #1b4332;
}

.total-label {
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 2px;
  color: #4b5563;
}

.total-amount {
  font-size: 1.75rem;
  font-weight: 800;
  color: #1b4332;
}
</style>
