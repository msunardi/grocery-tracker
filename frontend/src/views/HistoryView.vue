<template>
  <div class="history">
    <div class="page-header">
      <h1 class="page-title">📋 Receipt History</h1>
      <div class="header-actions">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by store..."
            class="search-input"
          />
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state card">
      <div class="loading-spinner">⟳</div>
      <p>Loading receipts...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredReceipts.length === 0" class="empty-state card">
      <div class="empty-icon">🧾</div>
      <h3>No receipts found</h3>
      <p v-if="searchQuery">No receipts matching "{{ searchQuery }}"</p>
      <p v-else>Upload your first receipt to get started!</p>
      <router-link v-if="!searchQuery" to="/" class="btn btn-primary">
        📷 Scan a Receipt
      </router-link>
    </div>

    <!-- Receipt List -->
    <div v-else class="receipts-grid">
      <div
        v-for="receipt in filteredReceipts"
        :key="receipt.id"
        class="receipt-card card"
        @click="openReceipt(receipt.id)"
      >
        <div class="receipt-card-header">
          <div class="store-info">
            <div class="store-icon">🏪</div>
            <div>
              <div class="store-name">{{ receipt.store_name }}</div>
              <div class="receipt-date">{{ formatDate(receipt.purchase_date || receipt.created_at) }}</div>
            </div>
          </div>
          <div class="receipt-total" v-if="receipt.total_price != null">
            {{ formatPrice(receipt.total_price) }}
          </div>
        </div>
        <div class="receipt-card-footer">
          <span class="receipt-id">Receipt #{{ receipt.id }}</span>
          <span class="view-btn">View Details →</span>
        </div>
      </div>
    </div>

    <!-- Receipt Detail Modal -->
    <div v-if="selectedReceipt" class="modal-overlay" @click.self="closeReceipt">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-store-info">
            <!-- View mode -->
            <template v-if="!editMode">
              <h2>{{ selectedReceipt.receipt.store_name }}</h2>
              <p v-if="selectedReceipt.receipt.purchase_date">
                📅 {{ formatDate(selectedReceipt.receipt.purchase_date) }}
              </p>
            </template>
            <!-- Edit mode -->
            <template v-else>
              <input
                v-model="editData.store_name"
                class="edit-input edit-store-name"
                placeholder="Store name"
              />
              <input
                v-model="editData.purchase_date"
                type="date"
                class="edit-input edit-date"
              />
            </template>
          </div>
          <div class="modal-header-actions">
            <button v-if="!editMode" class="btn-icon" title="Edit receipt" @click="enterEditMode">✏️</button>
            <button class="modal-close" @click="closeReceipt">✕</button>
          </div>
        </div>

        <div class="modal-items">
          <!-- View mode table -->
          <div v-if="!editMode" class="items-table">
            <div class="table-header">
              <span class="col-name">Item</span>
              <span class="col-category">Category</span>
              <span class="col-qty">Qty</span>
              <span class="col-price">Price</span>
            </div>
            <div
              v-for="item in selectedReceipt.items"
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

          <!-- Edit mode table -->
          <div v-else class="items-table items-table-edit">
            <div class="table-header table-header-edit">
              <span class="col-name">Item</span>
              <span class="col-qty">Qty</span>
              <span class="col-price">Price</span>
              <span class="col-del"></span>
            </div>
            <div
              v-for="(item, index) in editData.items"
              :key="item.id ?? 'new-' + index"
              class="table-row table-row-edit"
            >
              <input v-model="item.name" class="edit-input" placeholder="Item name" />
              <input v-model="item.quantity" class="edit-input" placeholder="Qty" />
              <input v-model="item.price" type="number" step="0.01" min="0" class="edit-input edit-price-input" placeholder="0.00" />
              <button class="btn-delete-item" title="Remove item" @click="removeItem(index)">✕</button>
            </div>
            <div class="add-item-row">
              <button class="btn btn-add-item" @click="addItem">+ Add Item</button>
            </div>
          </div>

          <div v-if="!editMode && selectedReceipt.items.length === 0" class="no-items">
            No items recorded for this receipt.
          </div>
        </div>

        <div class="modal-footer">
          <div class="modal-total">
            <span class="total-label">TOTAL</span>
            <span v-if="!editMode" class="total-amount">
              {{ selectedReceipt.receipt.total_price != null ? formatPrice(selectedReceipt.receipt.total_price) : '—' }}
            </span>
            <input
              v-else
              v-model="editData.total_price"
              type="number"
              step="0.01"
              min="0"
              class="edit-input edit-total-input"
              placeholder="0.00"
            />
          </div>
          <div class="footer-actions">
            <template v-if="!editMode">
              <button class="btn btn-danger" @click="deleteReceipt(selectedReceipt.receipt.id)">
                🗑 Delete Receipt
              </button>
            </template>
            <template v-else>
              <button class="btn btn-secondary" @click="cancelEdit" :disabled="saving">Cancel</button>
              <button class="btn btn-primary" @click="saveEdit" :disabled="saving">
                {{ saving ? 'Saving…' : '✓ Save' }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const receipts = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const selectedReceipt = ref(null);

const editMode = ref(false);
const editData = ref(null);
const deletedItemIds = ref([]);
const saving = ref(false);

const filteredReceipts = computed(() => {
  if (!searchQuery.value) return receipts.value;
  const q = searchQuery.value.toLowerCase();
  return receipts.value.filter(r =>
    r.store_name.toLowerCase().includes(q)
  );
});

async function loadReceipts() {
  loading.value = true;
  try {
    const res = await axios.get('/api/receipts');
    receipts.value = res.data;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function openReceipt(id) {
  try {
    const res = await axios.get(`/api/receipts/${id}`);
    selectedReceipt.value = res.data;
  } catch (e) {
    console.error(e);
  }
}

function closeReceipt() {
  selectedReceipt.value = null;
  editMode.value = false;
  editData.value = null;
  deletedItemIds.value = [];
}

async function deleteReceipt(id) {
  if (!confirm('Delete this receipt?')) return;
  try {
    await axios.delete(`/api/receipts/${id}`);
    receipts.value = receipts.value.filter(r => r.id !== id);
    closeReceipt();
  } catch (e) {
    console.error(e);
  }
}

function enterEditMode() {
  editData.value = {
    store_name: selectedReceipt.value.receipt.store_name,
    purchase_date: selectedReceipt.value.receipt.purchase_date || '',
    total_price: selectedReceipt.value.receipt.total_price ?? '',
    items: selectedReceipt.value.items.map(item => ({ ...item })),
  };
  deletedItemIds.value = [];
  editMode.value = true;
}

function cancelEdit() {
  editMode.value = false;
  editData.value = null;
  deletedItemIds.value = [];
}

function removeItem(index) {
  const item = editData.value.items[index];
  if (item.id) deletedItemIds.value.push(item.id);
  editData.value.items.splice(index, 1);
}

function addItem() {
  editData.value.items.push({ name: '', quantity: '1', price: '' });
}

async function saveEdit() {
  saving.value = true;
  try {
    const receiptId = selectedReceipt.value.receipt.id;

    await axios.put(`/api/receipts/${receiptId}`, {
      store_name: editData.value.store_name,
      purchase_date: editData.value.purchase_date || null,
      total_price: editData.value.total_price !== '' ? Number(editData.value.total_price) : null,
    });

    for (const id of deletedItemIds.value) {
      await axios.delete(`/api/items/${id}`);
    }

    for (const item of editData.value.items) {
      if (item.id) {
        await axios.put(`/api/items/${item.id}`, {
          name: item.name,
          quantity: item.quantity,
          price: item.price !== '' ? Number(item.price) : null,
        });
      } else if (item.name.trim()) {
        await axios.post(`/api/receipts/${receiptId}/items`, {
          name: item.name,
          quantity: item.quantity,
          price: item.price !== '' ? Number(item.price) : null,
        });
      }
    }

    const res = await axios.get(`/api/receipts/${receiptId}`);
    selectedReceipt.value = res.data;
    const idx = receipts.value.findIndex(r => r.id === receiptId);
    if (idx !== -1) receipts.value[idx] = res.data.receipt;

    editMode.value = false;
    editData.value = null;
    deletedItemIds.value = [];
  } catch (e) {
    console.error(e);
  } finally {
    saving.value = false;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown date';
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

onMounted(loadReceipts);
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1b4332;
}

.search-box {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.4rem 0.75rem;
  gap: 0.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.search-input {
  border: none;
  outline: none;
  font-size: 0.9rem;
  width: 200px;
  color: #374151;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 3rem;
}

.loading-spinner {
  font-size: 2rem;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-bottom: 0.5rem;
}

@keyframes spin { to { transform: rotate(360deg); } }

.empty-icon {
  font-size: 3rem;
  margin-bottom: 0.75rem;
}

.empty-state h3 {
  font-size: 1.2rem;
  color: #374151;
  margin-bottom: 0.4rem;
}

.empty-state p {
  color: #9ca3af;
  margin-bottom: 1.25rem;
}

.receipts-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.receipt-card {
  cursor: pointer;
  transition: all 0.2s;
  padding: 1.25rem 1.5rem;
}

.receipt-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.1);
  border-left: 3px solid #2d6a4f;
}

.receipt-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.store-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.store-icon {
  font-size: 1.5rem;
  background: #f0fdf4;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.store-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1a202c;
}

.receipt-date {
  font-size: 0.8rem;
  color: #9ca3af;
  margin-top: 0.15rem;
}

.receipt-total {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1b4332;
}

.receipt-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid #f3f4f6;
}

.receipt-id {
  font-size: 0.8rem;
  color: #d1d5db;
}

.view-btn {
  font-size: 0.85rem;
  color: #2d6a4f;
  font-weight: 600;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 680px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #f3f4f6;
}

.modal-store-info {
  flex: 1;
  min-width: 0;
}

.modal-store-info h2 {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1a202c;
  margin-bottom: 0.25rem;
}

.modal-store-info p {
  color: #6b7280;
  font-size: 0.9rem;
}

.modal-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.modal-close {
  background: #f3f4f6;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #6b7280;
  transition: all 0.2s;
}

.modal-close:hover { background: #e5e7eb; color: #374151; }

.btn-icon {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover { background: #dcfce7; }

.modal-items {
  padding: 1rem 1.5rem;
  flex: 1;
}

.modal-footer {
  padding: 1rem 1.5rem 1.5rem;
  border-top: 2px solid #1b4332;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-total {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.total-label {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 2px;
  color: #9ca3af;
}

.total-amount {
  font-size: 1.75rem;
  font-weight: 800;
  color: #1b4332;
}

.footer-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* Table styles (shared) */
.items-table { display: flex; flex-direction: column; }

.table-header, .table-row {
  display: grid;
  grid-template-columns: 1fr 120px 80px 80px;
  gap: 0.5rem;
  padding: 0.6rem 0.5rem;
  align-items: center;
}

.table-header-edit, .table-row-edit {
  grid-template-columns: 1fr 80px 90px 28px;
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

.item-name { font-weight: 500; color: #1a202c; }
.item-qty { color: #6b7280; font-size: 0.9rem; }
.item-price, .col-price { text-align: right; font-weight: 600; color: #1a202c; }

.no-items {
  text-align: center;
  color: #9ca3af;
  padding: 1.5rem;
  font-style: italic;
}

/* Edit inputs */
.edit-input {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
  font-size: 0.9rem;
  color: #1a202c;
  width: 100%;
  box-sizing: border-box;
  background: #fafafa;
  transition: border-color 0.15s;
}

.edit-input:focus {
  outline: none;
  border-color: #2d6a4f;
  background: white;
}

.edit-store-name {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.4rem;
}

.edit-date {
  font-size: 0.85rem;
  color: #6b7280;
}

.edit-price-input {
  text-align: right;
}

.edit-total-input {
  font-size: 1.4rem;
  font-weight: 700;
  width: 120px;
  text-align: right;
  color: #1b4332;
}

.btn-delete-item {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.2rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.btn-delete-item:hover { opacity: 1; }

.add-item-row {
  padding: 0.75rem 0.5rem 0.25rem;
}

.btn-add-item {
  background: #f0fdf4;
  border: 1px dashed #86efac;
  color: #2d6a4f;
  padding: 0.4rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-add-item:hover { background: #dcfce7; border-color: #4ade80; }

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
  text-decoration: none;
  transition: all 0.2s;
}

.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-primary {
  background: linear-gradient(135deg, #2d6a4f, #1b4332);
  color: white;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover { background: #e5e7eb; }

.btn-danger {
  background: #fee2e2;
  color: #991b1b;
}

.btn-danger:hover { background: #fecaca; }
</style>
