const CACHE_NAME = 'dmr-deck-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// App shell (this site's own files): cache-first, so the app opens instantly and works offline.
// Everything else (CDN scripts, fonts): network-first, falling back to cache when offline —
// keeps the Excel/chart libraries fresh when online, but still usable without a connection
// once they've been fetched at least once.
self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;

  const isSameOrigin = new URL(req.url).origin === self.location.origin;

  if(isSameOrigin){
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }))
    );
  } else {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
