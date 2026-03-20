<template>
  <div class="analytics">
    <h1 class="page-title">📊 Spending Analytics</h1>

    <!-- Loading -->
    <div v-if="loading" class="loading-state card">
      <div class="loading-spinner">⟳</div>
      <p>Loading analytics...</p>
    </div>

    <!-- No data -->
    <div v-else-if="!data || data.overview.total_receipts === 0" class="empty-state card">
      <div class="empty-icon">📊</div>
      <h3>No data yet</h3>
      <p>Scan some receipts to see your spending analytics!</p>
      <router-link to="/" class="btn btn-primary">📷 Scan a Receipt</router-link>
    </div>

    <!-- Analytics Content -->
    <div v-else class="analytics-content">

      <!-- Overview Stats -->
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-icon">🧾</div>
          <div class="stat-value">{{ data.overview.total_receipts }}</div>
          <div class="stat-label">Total Receipts</div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">💰</div>
          <div class="stat-value">{{ formatPrice(data.overview.total_spent || 0) }}</div>
          <div class="stat-label">Total Spent</div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">📈</div>
          <div class="stat-value">{{ formatPrice(data.overview.avg_per_receipt || 0) }}</div>
          <div class="stat-label">Avg per Trip</div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">🏆</div>
          <div class="stat-value">{{ formatPrice(data.overview.max_receipt || 0) }}</div>
          <div class="stat-label">Largest Trip</div>
        </div>
      </div>

      <!-- Two column layout -->
      <div class="charts-row">

        <!-- Spending by Category -->
        <div class="card chart-card">
          <h2 class="chart-title">Spending by Category</h2>
          <div v-if="data.byCategory.length === 0" class="no-data">No category data yet.</div>
          <div v-else class="category-bars">
            <div
              v-for="cat in topCategories"
              :key="cat.category"
              class="category-bar-row"
            >
              <div class="cat-info">
                <span class="cat-icon">{{ getCategoryIcon(cat.category) }}</span>
                <span class="cat-name">{{ cat.category || 'Other' }}</span>
                <span class="cat-count">({{ cat.count }} items)</span>
              </div>
              <div class="bar-container">
                <div
                  class="bar-fill"
                  :style="{ width: getBarWidth(cat.total, maxCategoryTotal) + '%' }"
                  :class="getCategoryBarClass(cat.category)"
                ></div>
              </div>
              <div class="cat-amount">{{ formatPrice(cat.total) }}</div>
            </div>
          </div>
        </div>

        <!-- Spending by Store -->
        <div class="card chart-card">
          <h2 class="chart-title">Spending by Store</h2>
          <div v-if="data.byStore.length === 0" class="no-data">No store data yet.</div>
          <div v-else class="store-list">
            <div
              v-for="(store, index) in data.byStore"
              :key="store.store_name"
              class="store-row"
            >
              <div class="store-rank">{{ index + 1 }}</div>
              <div class="store-info">
                <div class="store-name-text">{{ store.store_name }}</div>
                <div class="store-visits">{{ store.visits }} visit{{ store.visits !== 1 ? 's' : '' }}</div>
              </div>
              <div class="store-total">{{ formatPrice(store.total) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Breakdown Donut (CSS-based) -->
      <div class="card" v-if="data.byCategory.length > 0">
        <h2 class="chart-title">Category Breakdown</h2>
        <div class="donut-section">
          <div class="donut-chart">
            <svg viewBox="0 0 200 200" class="donut-svg">
              <circle
                v-for="(seg, i) in donutSegments"
                :key="i"
                cx="100"
                cy="100"
                r="70"
                fill="none"
                :stroke="seg.color"
                stroke-width="40"
                :stroke-dasharray="`${seg.dash} ${seg.gap}`"
                :stroke-dashoffset="seg.offset"
                class="donut-segment"
              />
              <text x="100" y="96" text-anchor="middle" class="donut-center-label">Total</text>
              <text x="100" y="114" text-anchor="middle" class="donut-center-value">
                {{ formatPrice(data.overview.total_spent || 0) }}
              </text>
            </svg>
          </div>
          <div class="donut-legend">
            <div
              v-for="(seg, i) in donutSegments"
              :key="i"
              class="legend-item"
            >
              <div class="legend-color" :style="{ background: seg.color }"></div>
              <div class="legend-info">
                <span class="legend-name">{{ seg.label }}</span>
                <span class="legend-pct">{{ seg.pct.toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const data = ref(null);
const loading = ref(true);

async function loadAnalytics() {
  loading.value = true;
  try {
    const res = await axios.get('/api/analytics');
    data.value = res.data;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

const topCategories = computed(() => {
  if (!data.value) return [];
  return data.value.byCategory.slice(0, 8);
});

const maxCategoryTotal = computed(() => {
  if (!data.value?.byCategory.length) return 1;
  return Math.max(...data.value.byCategory.map(c => c.total));
});

function getBarWidth(value, max) {
  return max > 0 ? Math.max((value / max) * 100, 3) : 0;
}

const CATEGORY_COLORS = [
  '#2d6a4f', '#40916c', '#52b788', '#74c69d',
  '#95d5b2', '#b7e4c7', '#d8f3dc', '#1b4332',
];

const donutSegments = computed(() => {
  if (!data.value?.byCategory.length) return [];
  const total = data.value.byCategory.reduce((sum, c) => sum + c.total, 0);
  const circumference = 2 * Math.PI * 70; // ~439.8
  let offset = circumference * 0.25; // start at top

  return data.value.byCategory.slice(0, 6).map((cat, i) => {
    const pct = total > 0 ? (cat.total / total) * 100 : 0;
    const dash = (pct / 100) * circumference;
    const gap = circumference - dash;
    const seg = {
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      dash,
      gap,
      offset: -offset + circumference * 0.25,
      label: cat.category || 'Other',
      pct,
    };
    offset += dash;
    return seg;
  });
});

const CATEGORY_ICONS = {
  'Produce': '🥦',
  'Dairy': '🥛',
  'Meat': '🥩',
  'Bakery': '🍞',
  'Beverages': '🥤',
  'Snacks': '🍿',
  'Household': '🧹',
  'Frozen': '🧊',
  'Canned': '🥫',
  'Personal Care': '🧴',
  'Other': '📦',
};

function getCategoryIcon(cat) {
  return CATEGORY_ICONS[cat] || '📦';
}

const BAR_CLASSES = {
  'Produce': 'bar-green',
  'Dairy': 'bar-blue',
  'Meat': 'bar-red',
  'Bakery': 'bar-yellow',
  'Beverages': 'bar-blue',
  'Snacks': 'bar-yellow',
  'Household': 'bar-gray',
  'Frozen': 'bar-blue',
};

function getCategoryBarClass(cat) {
  return BAR_CLASSES[cat] || 'bar-gray';
}

function formatPrice(price) {
  return '$' + Number(price).toFixed(2);
}

onMounted(loadAnalytics);
</script>

<style scoped>
.analytics { display: flex; flex-direction: column; gap: 1.5rem; }

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1b4332;
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

.empty-icon { font-size: 3rem; margin-bottom: 0.75rem; }
.empty-state h3 { font-size: 1.2rem; color: #374151; margin-bottom: 0.4rem; }
.empty-state p { color: #9ca3af; margin-bottom: 1.25rem; }

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  text-align: center;
  padding: 1.5rem 1rem;
}

.stat-icon { font-size: 1.75rem; margin-bottom: 0.5rem; }
.stat-value { font-size: 1.5rem; font-weight: 800; color: #1b4332; margin-bottom: 0.25rem; }
.stat-label { font-size: 0.8rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }

/* Charts Row */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.chart-card { padding: 1.5rem; }
.chart-title { font-size: 1rem; font-weight: 700; color: #1a202c; margin-bottom: 1.25rem; }

/* Category Bars */
.category-bar-row {
  display: grid;
  grid-template-columns: 160px 1fr 70px;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.cat-info {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
}

.cat-icon { font-size: 1rem; }
.cat-name { font-weight: 600; color: #374151; }
.cat-count { color: #d1d5db; font-size: 0.75rem; }

.bar-container {
  background: #f3f4f6;
  border-radius: 6px;
  height: 10px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease;
}

.bar-green { background: linear-gradient(90deg, #2d6a4f, #52b788); }
.bar-blue { background: linear-gradient(90deg, #1d4ed8, #60a5fa); }
.bar-red { background: linear-gradient(90deg, #b91c1c, #f87171); }
.bar-yellow { background: linear-gradient(90deg, #b45309, #fcd34d); }
.bar-gray { background: linear-gradient(90deg, #6b7280, #d1d5db); }

.cat-amount {
  text-align: right;
  font-weight: 700;
  font-size: 0.85rem;
  color: #1a202c;
}

.no-data { text-align: center; color: #9ca3af; padding: 1.5rem; font-style: italic; }

/* Store List */
.store-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.store-row:last-child { border-bottom: none; }

.store-rank {
  width: 28px;
  height: 28px;
  background: #f0fdf4;
  color: #1b4332;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  flex-shrink: 0;
}

.store-info { flex: 1; }
.store-name-text { font-weight: 600; color: #1a202c; font-size: 0.9rem; }
.store-visits { font-size: 0.78rem; color: #9ca3af; }
.store-total { font-weight: 800; color: #1b4332; font-size: 0.95rem; }

/* Donut Chart */
.donut-section {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 0.5rem 0;
}

.donut-chart {
  width: 180px;
  height: 180px;
  flex-shrink: 0;
}

.donut-svg { width: 100%; height: 100%; transform: rotate(-90deg); }

.donut-segment { transition: stroke-dasharray 0.5s ease; }

.donut-center-label {
  fill: #9ca3af;
  font-size: 10px;
  font-weight: 600;
  transform: rotate(90deg);
  transform-origin: center;
}

.donut-center-value {
  fill: #1b4332;
  font-size: 12px;
  font-weight: 800;
  transform: rotate(90deg);
  transform-origin: center;
}

.donut-legend {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legend-info {
  display: flex;
  flex-direction: column;
}

.legend-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
}

.legend-pct {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* Responsive */
@media (max-width: 700px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .charts-row { grid-template-columns: 1fr; }
  .donut-section { flex-direction: column; }
  .donut-legend { grid-template-columns: repeat(3, 1fr); }
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
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #2d6a4f, #1b4332);
  color: white;
}
</style>
