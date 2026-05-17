const CACHE_NAME = 'growflow-v1';
const STATIC_ASSETS = ['/', '/generate', '/hooks', '/ideas'];

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
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Static Assets (CSS, JS, Images): Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
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
