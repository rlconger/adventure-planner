const CACHE_NAME = 'adventure-planner-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Install event: Cache core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Strategy based on request type
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Strategy 1: Cache First for external CDNs (libraries, styles, icons)
  // These URLs are typically versioned or static
  if (url.origin !== location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          // Check if we received a valid response
          // Note: Opaque responses (type 'opaque') are common with CDNs (no-cors)
          // We still want to cache them for visual correctness, though we can't read status
          if (!response || (response.status !== 200 && response.type !== 'opaque')) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        }).catch(() => {
            // If fetch fails and not in cache, nothing we can do for external resources
            // unless we provide a fallback.
        });
      })
    );
    return;
  }

  // Strategy 2: Network First, Fallback to Cache for local app files
  // This ensures we always try to get the latest code (hot reload/updates)
  // but can still work offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If successful network request, cache it
        if (!response || response.status !== 200) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request);
      })
  );
});