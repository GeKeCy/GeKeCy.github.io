const CACHE_NAME = 'gekecy-v1.7.367';

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

function putToCache(request, response) {
  if (response && response.ok) {
    var clone = response.clone();
    caches.open(CACHE_NAME).then(function(cache) { cache.put(request, clone); });
  }
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // 带 _t= 的破缓存请求：完全绕过 Service Worker，直接走网络，防止被喂回旧页面
  try {
    if (new URL(e.request.url).searchParams.has('_t')) return;
  } catch (err) {}

  // 页面导航：网络优先，避免老用户长期停留在旧版本；离线时回退缓存
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function(networkRes) {
        putToCache(e.request, networkRes);
        return networkRes;
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // 静态资源：缓存优先，后台静默更新
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        fetch(e.request).then(function(networkRes) {
          putToCache(e.request, networkRes);
        }).catch(function() {});
        return cached;
      }
      return fetch(e.request).then(function(networkRes) {
        putToCache(e.request, networkRes);
        return networkRes;
      }).catch(function() {
        return caches.match('./index.html');
      });
    })
  );
});
