import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import { readFileSync } from 'fs';
import HomeView from '../src/views/HomeView.vue';
import { mountWithRouter, waitFor } from './mountWithRouter.js';

const TEST_IMAGE = '/home/node/grocery-tracker/test_receipt.jpg';

function makeFile() {
  const bytes = readFileSync(TEST_IMAGE);
  return new File([bytes], 'test_receipt.jpg', { type: 'image/jpeg' });
}

describe('HomeView', () => {
  it('renders upload zone with no action row initially', () => {
    const wrapper = mountWithRouter(HomeView);
    expect(wrapper.text()).toContain('Scan Your Receipt');
    expect(wrapper.find('.drop-zone').exists()).toBe(true);
    expect(wrapper.find('.action-row').exists()).toBe(false);
  });

  it('shows action buttons after file selection', async () => {
    const wrapper = mountWithRouter(HomeView);
    wrapper.vm.setFile(makeFile());
    await nextTick();
    await new Promise((r) => setTimeout(r, 100)); // let FileReader fire
    expect(wrapper.find('.action-row').exists()).toBe(true);
    expect(wrapper.text()).toContain('Analyze Receipt');
    expect(wrapper.text()).toContain('Clear');
  });

  it('uploads receipt and shows result card', async () => {
    const wrapper = mountWithRouter(HomeView);
    wrapper.vm.setFile(makeFile());
    await nextTick();

    wrapper.vm.processReceipt();
    await waitFor(() => !wrapper.vm.isProcessing);
    await nextTick();

    expect(wrapper.vm.errorMessage).toBe('');
    expect(wrapper.vm.result).not.toBeNull();
    expect(wrapper.text()).toContain('Receipt Scanned Successfully');
    expect(wrapper.find('.store-name').exists()).toBe(true);
  });

  it('clearFile resets state', async () => {
    const wrapper = mountWithRouter(HomeView);
    wrapper.vm.setFile(makeFile());
    await nextTick();
    wrapper.vm.clearFile();
    await nextTick();
    expect(wrapper.find('.action-row').exists()).toBe(false);
    expect(wrapper.vm.previewUrl).toBeNull();
    expect(wrapper.vm.selectedFile).toBeNull();
  });

  it('shows error when dropping a non-image file', async () => {
    const wrapper = mountWithRouter(HomeView);
    const nonImage = new File(['hello'], 'doc.txt', { type: 'text/plain' });
    await wrapper.find('.drop-zone').trigger('drop', {
      dataTransfer: { files: [nonImage] },
    });
    await nextTick();
    expect(wrapper.vm.errorMessage).toContain('Please drop an image file');
    expect(wrapper.find('.error-banner').exists()).toBe(true);
  });
});
