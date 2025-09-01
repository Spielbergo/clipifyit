const STATIC_CACHE = 'static-v1';
const RUNTIME_CACHE = 'runtime-v1';
const PRECACHE_URLS = [
  '/', '/prices', '/saved',
  '/favicon.ico', '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== STATIC_CACHE && k !== RUNTIME_CACHE) ? caches.delete(k) : null))
    ).then(() => self.clients.claim())
  );
});

// Network-first for navigations with cache fallback; SWR for Next assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Handle Web Share Target: Android PWA share sheet posts here
  try {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/share-target') {
      event.respondWith((async () => {
        try {
          const formData = await request.clone().formData();
          const title = (formData.get('title') || '').toString();
          const text = (formData.get('text') || '').toString();
          const sharedUrl = (formData.get('url') || '').toString();
          const params = new URLSearchParams();
          if (title) params.set('shareTitle', title);
          if (text) params.set('shareText', text);
          if (sharedUrl) {
            params.set('shareUrl', sharedUrl);
            params.set('url', sharedUrl); // saved.jsx listens for `url`
          }
          // Redirect to Saved Articles with payload; 303 ensures a GET
          const qs = params.toString();
          return Response.redirect(qs ? `/saved?${qs}` : '/saved', 303);
        } catch (e) {
          return Response.redirect('/saved', 303);
        }
      })());
      return;
    }
  } catch {}

  // Handle Next static assets with stale-while-revalidate
  if (request.url.includes('/_next/')) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then(resp => {
        cache.put(request, resp.clone());
        return resp;
      }).catch(() => cached);
      return cached || fetchPromise;
    })());
    return;
  }

  // Navigation requests
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const resp = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, resp.clone());
        return resp;
      } catch {
        // Fallback to cached page (saved, prices, home) if available
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        return (await caches.open(STATIC_CACHE)).match('/saved') ||
               (await caches.open(STATIC_CACHE)).match('/');
      }
    })());
  }
});

// Handle client-initiated sync to prime offline caches
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'OFFLINE_SYNC') {
    event.waitUntil((async () => {
      try {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.addAll(['/', '/prices', '/saved']);
      } catch (e) {
        // ignore
      }
    })());
  }
});
