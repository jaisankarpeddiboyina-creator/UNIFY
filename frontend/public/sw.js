// Minimal, safe service worker.
// CRA uses content-hashed filenames so we do NOT pre-cache static assets here
// (those paths change on every build and cause install failures).
// Instead: network-first for everything, with graceful offline fallback.

const CACHE_NAME = 'unify-v1';

self.addEventListener('install', () => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Delete any old caches from previous versions
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests; skip non-http(s) schemes
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // Network first: try the network, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses (but not API calls)
        if (response.ok && !event.request.url.includes('/api/')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
