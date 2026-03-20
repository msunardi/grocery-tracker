<template>
  <div class="app">
    <nav class="navbar">
      <div class="nav-brand">
        <span class="brand-icon">🛒</span>
        <span class="brand-name">Grocery Tracker</span>
      </div>
      <div class="nav-links">
        <router-link to="/" class="nav-link" exact-active-class="active">
          <span class="nav-icon">📷</span> Scan Receipt
        </router-link>
        <router-link to="/history" class="nav-link" active-class="active">
          <span class="nav-icon">📋</span> History
        </router-link>
        <router-link to="/analytics" class="nav-link" active-class="active">
          <span class="nav-icon">📊</span> Analytics
        </router-link>
      </div>
    </nav>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f0f4f8;
  color: #1a202c;
  min-height: 100vh;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background: linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%);
  color: white;
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.brand-icon {
  font-size: 1.5rem;
}

.nav-links {
  display: flex;
  gap: 0.5rem;
}

.nav-link {
  color: rgba(255,255,255,0.8);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.nav-link:hover {
  background: rgba(255,255,255,0.15);
  color: white;
}

.nav-link.active {
  background: rgba(255,255,255,0.2);
  color: white;
}

.nav-icon {
  font-size: 1rem;
}

.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

/* Shared card styles */
.card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  padding: 1.5rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1b4332;
  margin-bottom: 1.5rem;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-green { background: #d1fae5; color: #065f46; }
.badge-blue { background: #dbeafe; color: #1e40af; }
.badge-yellow { background: #fef3c7; color: #92400e; }
.badge-purple { background: #ede9fe; color: #5b21b6; }
.badge-red { background: #fee2e2; color: #991b1b; }
.badge-gray { background: #f3f4f6; color: #374151; }

@media (max-width: 640px) {
  .navbar { padding: 0 1rem; }
  .nav-brand .brand-name { display: none; }
  .nav-link { padding: 0.5rem 0.75rem; font-size: 0.8rem; }
  .main-content { padding: 1rem; }
}
</style>
