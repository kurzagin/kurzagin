// ============================================================
// kurzagin — Service Worker (PWA)
// ============================================================

const CACHE_VERSION = 'krzgn-v2.0.7-live';
const STATIC_CACHE = `krzgn-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `krzgn-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Pre-cache only truly static shell assets (never pre-cache dynamic SSR HTML)
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/main.js',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-192x192.png',
  '/apple-touch-icon.png'
];

// Install: precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache asset failed:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) {
            console.log('[SW] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Only process GET requests
  if (request.method !== 'GET') return;

  // 2. Ignore non-HTTP/HTTPS schemes (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // 3. Audio & Range requests: bypass cache to prevent audio streaming playback breakdown
  if (
    request.headers.has('range') ||
    url.pathname.match(/\.(mp3|wav|ogg|opus|m4a|aac|flac)$/i) ||
    url.pathname.includes('/api/media/presign-audio')
  ) {
    return;
  }

  // 3b. Application runtime scripts: Network-first to prevent stale JS engine caching
  if (url.pathname === '/main.js') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 4. API endpoints & Authentication routes: Network first, never block dynamic server actions
  if (url.pathname.startsWith('/api/')) {
    // For read-only public endpoints (like tracks or gallery), fallback to cache on network failure
    if (url.pathname.startsWith('/api/tracks') || url.pathname.startsWith('/api/gallery')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => caches.match(request))
      );
      return;
    }
    // All other API requests pass directly to network
    return;
  }

  // 4b. Next.js App Router RSC / prefetch payloads: always straight to network (never cache-first)
  if (
    request.headers.get('rsc') !== null ||
    url.searchParams.has('_rsc') ||
    request.headers.get('next-router-prefetch') !== null
  ) {
    return;
  }

  // 5. HTML Navigation requests (pages)
  const isHtmlRequest =
    request.mode === 'navigate' ||
    (request.method === 'GET' && (
      Boolean(request.headers.get('accept')?.includes('text/html'))
    ));

  if (isHtmlRequest) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Try matched page from cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          // If offline and page not cached, show offline page
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;

          return new Response('Offline - No connection', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        })
    );
    return;
  }

  // 6. Google Fonts & Static assets: Stale-While-Revalidate
  const isFont = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');
  const isStatic =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/_next/static/') ||
     url.pathname.startsWith('/styles/') ||
     url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|webp|ico|woff2?|ttf)$/i));

  if (isFont || isStatic) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null);

        return cached || (await networkFetch);
      })
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
      );
    })
  );
});

// Message listener (skipWaiting trigger)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
