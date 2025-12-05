const CACHE_NAME = 'cronograma-v1';
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([
      '/', '/index.html', '/styles.css', '/app.js', '/icon-192.png', '/icon-512.png'
    ]))
  );
});
self.addEventListener('fetch', e=>{
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
