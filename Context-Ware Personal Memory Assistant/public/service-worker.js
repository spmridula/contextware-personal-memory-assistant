/**
 * Service Worker for Offline Support
 * Caches all necessary assets for offline operation
 */

const CACHE_NAME = 'face-memory-cache-v1';
const MODEL_CACHE_NAME = 'face-models-cache-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
];

// Face-api model files to cache
const MODEL_ASSETS = [
  '/models/tiny_face_detector_model-weights_manifest.json',
  '/models/tiny_face_detector_model.bin',
  '/models/face_landmark_68_model-weights_manifest.json',
  '/models/face_landmark_68_model.bin',
  '/models/face_recognition_model-weights_manifest.json',
  '/models/face_recognition_model.bin',
];

/**
 * Install event - cache static assets and models
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Some static assets failed to cache:', err);
        });
      }),
      // Cache model files
      caches.open(MODEL_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching model files');
        return cache.addAll(MODEL_ASSETS).catch((err) => {
          console.warn('[SW] Some model files failed to cache:', err);
        });
      }),
    ]).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== CACHE_NAME && name !== MODEL_CACHE_NAME;
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

/**
 * Fetch event - serve from cache, fallback to network
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle model files with model cache
  if (url.pathname.startsWith('/models/')) {
    event.respondWith(
      caches.open(MODEL_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        // Don't cache non-successful responses
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Clone the response for caching
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        console.warn('[SW] Fetch failed:', err);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }

        throw err;
      });
    })
  );
});

/**
 * Message handler for cache updates
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    Promise.all([
      caches.has(CACHE_NAME),
      caches.has(MODEL_CACHE_NAME),
    ]).then(([hasStatic, hasModels]) => {
      event.ports[0].postMessage({
        staticCached: hasStatic,
        modelsCached: hasModels,
      });
    });
  }
});
