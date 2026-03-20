import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { readFileSync } from 'fs';
import axios from 'axios';
import HistoryView from '../src/views/HistoryView.vue';
import { mountWithRouter, waitFor } from './mountWithRouter.js';

const TEST_IMAGE = '/home/node/grocery-tracker/test_receipt.jpg';
let seededReceiptId = null;

beforeAll(async () => {
  const bytes = readFileSync(TEST_IMAGE);
  const file = new File([bytes], 'test_receipt.jpg', { type: 'image/jpeg' });
  const form = new FormData();
  form.append('receipt', file);
  const res = await axios.post('/api/receipts/upload', form);
  seededReceiptId = res.data.receipt.id;
}, 90000);

afterAll(async () => {
  if (seededReceiptId) {
    await axios.delete(`/api/receipts/${seededReceiptId}`).catch(() => {});
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HistoryView', () => {
  it('renders receipt list after loading', async () => {
    const wrapper = mountWithRouter(HistoryView);
    expect(wrapper.vm.loading).toBe(true);
    await waitFor(() => !wrapper.vm.loading);
    await nextTick();
    expect(wrapper.findAll('.receipt-card').length).toBeGreaterThan(0);
    expect(wrapper.find('.store-name').exists()).toBe(true);
  });

  it('search filter shows empty state for no matches', async () => {
    const wrapper = mountWithRouter(HistoryView);
    await waitFor(() => !wrapper.vm.loading);
    await nextTick();
    wrapper.vm.searchQuery = 'zzznomatch';
    await nextTick();
    expect(wrapper.find('.receipts-grid').exists()).toBe(false);
    expect(wrapper.text()).toContain('No receipts matching');
  });

  it('openReceipt shows modal with store name', async () => {
    const wrapper = mountWithRouter(HistoryView);
    await waitFor(() => !wrapper.vm.loading);
    await nextTick();
    await wrapper.find('.receipt-card').trigger('click');
    await waitFor(() => wrapper.vm.selectedReceipt !== null);
    await nextTick();
    expect(wrapper.find('.modal-overlay').exists()).toBe(true);
    expect(wrapper.find('.modal-close').exists()).toBe(true);
    expect(wrapper.find('.modal-footer').exists()).toBe(true);
  });

  it('closeReceipt hides the modal', async () => {
    const wrapper = mountWithRouter(HistoryView);
    await waitFor(() => !wrapper.vm.loading);
    await nextTick();
    await wrapper.find('.receipt-card').trigger('click');
    await waitFor(() => wrapper.vm.selectedReceipt !== null);
    await wrapper.find('.modal-close').trigger('click');
    await nextTick();
    expect(wrapper.find('.modal-overlay').exists()).toBe(false);
  });

  it('deleteReceipt removes the receipt from the list', async () => {
    const wrapper = mountWithRouter(HistoryView);
    await waitFor(() => !wrapper.vm.loading);
    await nextTick();
    const countBefore = wrapper.findAll('.receipt-card').length;
    vi.stubGlobal('confirm', () => true);
    await wrapper.vm.deleteReceipt(seededReceiptId);
    await nextTick();
    expect(wrapper.findAll('.receipt-card').length).toBe(countBefore - 1);
    seededReceiptId = null; // already deleted, skip afterAll cleanup
  });
});
