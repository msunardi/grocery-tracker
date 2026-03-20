import { describe, it, expect, vi, afterEach } from 'vitest';
import { nextTick } from 'vue';
import axios from 'axios';
import AnalyticsView from '../src/views/AnalyticsView.vue';
import { mountWithRouter, waitFor } from './mountWithRouter.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AnalyticsView', () => {
  it('shows loading state initially', () => {
    const wrapper = mountWithRouter(AnalyticsView);
    expect(wrapper.text()).toContain('Loading analytics...');
  });

  it('renders overview stat cards after load', async () => {
    const wrapper = mountWithRouter(AnalyticsView);
    await waitFor(() => !wrapper.vm.loading);
    await nextTick();
    expect(wrapper.findAll('.stat-card').length).toBe(4);
    expect(wrapper.text()).toContain('Total Receipts');
    expect(wrapper.text()).toContain('Total Spent');
    expect(wrapper.text()).toContain('Avg per Trip');
  });

  it('renders category bars when data is present', async () => {
    const wrapper = mountWithRouter(AnalyticsView);
    await waitFor(() => !wrapper.vm.loading);
    await nextTick();
    if (wrapper.vm.data?.byCategory?.length > 0) {
      expect(wrapper.find('.category-bars').exists()).toBe(true);
      expect(wrapper.findAll('.category-bar-row').length).toBeGreaterThan(0);
    }
  });

  it('shows empty state when no receipts', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: { overview: { total_receipts: 0 }, byCategory: [], byStore: [] },
    });
    const wrapper = mountWithRouter(AnalyticsView);
    await waitFor(() => !wrapper.vm.loading);
    await nextTick();
    expect(wrapper.text()).toContain('No data yet');
    expect(wrapper.find('a[href="#/"]').exists()).toBe(true);
  });
});
