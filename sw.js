const CACHE_NAME = 'gekecy-v1.6.353';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './1774103627050.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_ASSETS);
    }).catch(err => {
      console.log('Cache install error:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        fetch(e.request).then(function(networkRes) {
          if (networkRes && networkRes.ok) {
            var clone = networkRes.clone();
            caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
          }
        }).catch(function() {});
        return cached;
      }

      return fetch(e.request).then(function(networkRes) {
        if (networkRes && networkRes.ok) {
          var clone = networkRes.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        }
        return networkRes;
      }).catch(function() {
        return caches.match('./index.html');
      });
    })
  );
});
