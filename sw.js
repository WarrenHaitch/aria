// ARIA v4 Service Worker
// Controls caching, offline support, and update notifications

const CACHE_NAME = 'aria-v4-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap'
];

// ── INSTALL: cache all core assets ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('ARIA SW: Some assets failed to cache', err);
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: clear old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: network first, fallback to cache ──
self.addEventListener('fetch', event => {
  // Don't intercept Anthropic API calls — always go to network
  if (event.request.url.includes('api.anthropic.com')) return;
  // Don't intercept fonts from Google — let them handle caching
  if (event.request.url.includes('fonts.gstatic.com')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback — serve from cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // If nothing cached, return the main HTML (offline shell)
          return caches.match('/index.html');
        });
      })
  );
});

// ── MESSAGE: handle update checks from app ──
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
