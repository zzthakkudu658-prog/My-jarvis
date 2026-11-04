const CACHE_NAME = 'jarvis-v2-cache';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// Install the new service worker
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await Promise.allSettled(
        APP_FILES.map(file => cache.add(file))
      );

      await self.skipWaiting();
    })()
  );
});

// Remove old caches and activate the new worker
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key => key.startsWith('jarvis-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

// Try the network first so the app gets the latest files
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle files from this website
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        const cached = await caches.match(request);

        if (cached) return cached;

        if (request.mode === 'navigate') {
          return (
            await caches.match('./index.html')
          ) || new Response('You are offline. Please connect to the internet.', {
            headers: { 'Content-Type': 'text/plain' }
          });
        }

        return new Response('File unavailable offline.', {
          status: 503
        });
      }
    })()
  );
});
