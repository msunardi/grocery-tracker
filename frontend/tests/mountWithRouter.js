import { mount } from '@vue/test-utils';
import { createRouter, createWebHashHistory } from 'vue-router';

export function mountWithRouter(Component) {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', component: { template: '<div/>' } },
      { path: '/history', component: { template: '<div/>' } },
      { path: '/analytics', component: { template: '<div/>' } },
    ],
  });
  return mount(Component, { global: { plugins: [router] } });
}

export async function waitFor(fn, timeout = 85000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('waitFor timed out');
}
