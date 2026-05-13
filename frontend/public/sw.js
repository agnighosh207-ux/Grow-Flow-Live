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
  // Network first for API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => 
        new Response(JSON.stringify({ error: "You are offline" }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }
  // Cache first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
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
