const CACHE_NAME = 'mapbox-tiles-cache-v1';

// Install event - claim clients immediately
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate event - cleanup old caches if needed
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
        }).then(() => self.clients.claim())
    );
});

// Fetch event - Intercept Mapbox requests
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Check if it's a Mapbox tile request
    // Targets: .pbf (vector), .webp/png/jpg (raster), .json (style/font)
    // We strictly target the tile heavy hitters to avoid breaking API logic
    const isMapboxTile = url.hostname.includes('mapbox.com') &&
        (url.pathname.endsWith('.pbf') ||
            url.pathname.endsWith('.webp') ||
            url.pathname.endsWith('.png') ||
            url.pathname.includes('/fonts/'));

    if (isMapboxTile) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                // Match requests ignoring query parameters (like Mapbox SKUs)
                // This allows our clean preloaded tiles to satisfy Mapbox's specific requests
                return cache.match(event.request, { ignoreSearch: true }).then((response) => {
                    // Cache Hit - Return the cached response
                    if (response) {
                        return response;
                    }

                    // Cache Miss - Fetch from network
                    return fetch(event.request).then((networkResponse) => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'cors') {
                            return networkResponse;
                        }

                        // Clone the response (streams can be read only once)
                        const responseToCache = networkResponse.clone();

                        cache.put(event.request, responseToCache);

                        return networkResponse;
                    }).catch(() => {
                        // Network failure fallback (optional)
                    });
                });
            })
        );
    }
});
