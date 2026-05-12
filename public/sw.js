const CACHE_NAME = 'stag-tracker-v3';
const BASE_PATH = '/stag-tracker';

// Only cache shell assets that don't have hashed filenames.
const urlsToCache = [
  `${BASE_PATH}/manifest.json`,
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        // Cache install error - app will still work without cache
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
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

// Fetch event - always go to network for HTML and JS so deploys take effect.
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests and chrome-extension requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  const isHtml =
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname === `${BASE_PATH}/` ||
    url.pathname === `${BASE_PATH}`;
  const isScript = url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs');

  // Network-only for HTML and JS (no cache fallback) — prevents serving stale
  // bundles after a deploy. Falls back to cached index.html only when offline.
  if (isHtml || isScript) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(`${BASE_PATH}/index.html`).then((r) => r || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
