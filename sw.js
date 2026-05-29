const CACHE_NAME = 'gekecy-v1.5.317';

// 核心资源：首次安装时缓存
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './1774103627050.png'
];

// 安装：缓存核心资源
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

// 激活：清理旧缓存并立即接管
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

// 抓取：Stale-While-Revalidate（先返回缓存，后台静默更新）
self.addEventListener('fetch', e => {
  // 只处理 GET 请求
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // 1. 如果有缓存，先返回缓存（秒开）
      // 2. 同时后台去网络获取最新版本
      const fetchPromise = fetch(e.request).then(networkRes => {
        if (networkRes && networkRes.ok) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, clone);
          });
        }
        return networkRes;
      }).catch(() => {
        // 网络失败，返回缓存（已在上面的 cached 中处理）
        return cached;
      });

      // 返回缓存（如果有），否则等网络请求
      return cached || fetchPromise;
    })
  );
});