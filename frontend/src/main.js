import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import HomeView from './views/HomeView.vue';
import HistoryView from './views/HistoryView.vue';
import AnalyticsView from './views/AnalyticsView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/history', component: HistoryView },
    { path: '/analytics', component: AnalyticsView },
  ],
});

createApp(App).use(router).mount('#app');
