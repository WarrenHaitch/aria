// ARIA v5 Service Worker
// CRITICAL: Never intercept POST requests or streaming responses
// Only cache static assets

const CACHE_NAME = 'aria-v5-static-2';
const STATIC_ASSETS = [
  '/aria/manifest.json',
  '/aria/icon-192.png',
  '/aria/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // NEVER intercept POST requests (API calls to Cloudflare proxy)
  if (req.method !== 'GET') return;

  // NEVER intercept requests to external domains (Cloudflare, Anthropic, Supabase)
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // NEVER intercept index.html — always fetch fresh so updates deploy immediately
  if (url.pathname === '/aria/' || url.pathname === '/aria/index.html') return;

  // For static assets only — cache first
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
