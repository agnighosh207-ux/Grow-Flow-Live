const CACHE_NAME = 'growflow-v1';
const STATIC_ASSETS = ['/', '/generate', '/hooks', '/ideas', '/trends', '/history', '/ghostwriter'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only intercept and cache GET requests (POST/PUT/DELETE/etc. are not cacheable and throw exceptions)
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isApi = url.pathname.startsWith('/api/');
  const isPage = STATIC_ASSETS.includes(url.pathname) || !url.pathname.includes('.');

  // 1. API Calls: Network First
  if (isApi) {
    event.respondWith(
      fetch(event.request).catch(() => 
        new Response(JSON.stringify({ error: "You are offline" }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // 2. Page Routes (index.html): Network First
  // This ensures that when we deploy a new version with new hashes, 
  // the browser fetches the new index.html first.
  if (isPage) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => {
          // If network fetch fails, first try to match the exact page route from cache
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // For SPA page routes, if the exact page isn't in cache, 
            // serve the root shell "/" which contains the cached index.html
            return caches.match('/').then(rootResponse => {
              if (rootResponse) {
                return rootResponse;
              }
              // Ultimate offline fallback response if "/" is somehow not in cache either
              return new Response(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline — GrowFlow AI</title><style>body{background:#0A0A0F;color:#9B9BA8;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;}h1{color:#5E6AD2;margin-bottom:8px;}button{background:#5E6AD2;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:500;margin-top:16px;}button:hover{background:#4d59c2;}</style></head><body><h1>GrowFlow AI</h1><p>You are currently offline or the connection is unstable.</p><button onclick="window.location.reload()">Retry Connection</button></body></html>',
                {
                  headers: { 'Content-Type': 'text/html; charset=utf-8' }
                }
              );
            });
          });
        })
    );
    return;
  }

  // 3. Static Assets (CSS, JS, Images): Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(err => {
          // If offline and request is for an image, we can return a transparent pixel
          if (event.request.headers.get('Accept')?.includes('image')) {
            return new Response(
              'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
              { headers: { 'Content-Type': 'image/gif' } }
            );
          }
          // Otherwise, return a basic offline error response (503 status)
          return new Response('Asset offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'GrowFlow AI', {
      body: data.body || 'Time to create content!',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'growflow-reminder',
      renotify: true,
      data: { url: data.url || '/generate' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/generate';
  event.waitUntil(clients.openWindow(url));
});
