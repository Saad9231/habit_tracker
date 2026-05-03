// ============================================================
//  sw.js — Service Worker for offline support
//  Cache-first strategy for static assets
// ============================================================

const CACHE_NAME = 'habit-cost-v3';
const ASSETS = [
  './',
  './index.html',
  './supply.html',
  './src/css/style.css',
  './src/css/supply.css',
  './src/js/main.js',
  './src/js/supplyMain.js',
  './src/js/ui.js',
  './src/js/supplyUI.js',
  './src/js/supplyTracker.js',
  './src/js/calculator.js',
  './src/js/constants.js',
  './src/js/validator.js',
  './src/js/audio.js',
  './src/js/sharedCurrency.js',
  './src/js/api.js',
];

// Install — cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache first, then network
self.addEventListener('fetch', (event) => {
  // Skip non-GET and external requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback
      if (event.request.destination === 'document') {
        return caches.match('/index.html');
      }
    })
  );
});
