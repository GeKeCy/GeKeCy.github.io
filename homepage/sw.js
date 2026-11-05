const CACHE_NAME = 'gekecy-v1.7.368'; // 版本号已递增，强制触发浏览器更新SW

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

  // 带 _t= 的破缓存请求：完全绕过 Service Worker，直接走网络
  try {
    if (new URL(e.request.url).searchParams.has('_t')) return;
  } catch (err) {}

  // ==========================================
  // 页面导航（即打开主页）：缓存优先 + 后台异步静默更新
  // ==========================================
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then(function(cached) {
        
        // 1. 无条件在后台发起真实网络请求，强制不走 HTTP 缓存
        var fetchPromise = fetch(e.request, { cache: 'no-store' }).then(function(networkRes) {
          if (networkRes && networkRes.ok) {
            var clone = networkRes.clone();
            return caches.open(CACHE_NAME).then(function(cache) {
              // 2. 确保无论打开的具体路径是什么，都强制把最新的页面覆盖更新到 index.html 等 Key 中
              return cache.put('./index.html', clone.clone()).then(function() {
                return cache.put(e.request, clone);
              }).catch(function(err){
                console.log('Cache put error:', err);
              });
            }).then(function() {
              return networkRes;
            });
          }
          return networkRes;
        }).catch(function(err) {
          console.log('Background fetch failed:', err);
        });

        // 3. 返回给浏览器渲染
        if (cached) {
          // 如果有缓存，瞬间响应给用户！并告诉浏览器【别杀我，我后台还在下载新版本】
          // e.waitUntil 会保证即使页面跳转了，SW 也会在后台把 fetchPromise 的任务执行完
          e.waitUntil(fetchPromise);
          return cached;
        } else {
          // 如果本地没缓存（如首次访问），则等待网络请求结束并返回
          return fetchPromise.then(function(res) {
            return res || caches.match('./index.html');
          });
        }
      })
    );
    return;
  }

  // ==========================================
  // 静态资源：缓存优先，后台静默更新
  // ==========================================
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        // 有缓存先给，同时后台发请求更新本地缓存
        e.waitUntil(
          fetch(e.request).then(function(networkRes) {
            putToCache(e.request, networkRes);
          }).catch(function() {})
        );
        return cached;
      }
      // 没缓存走网络，并存入缓存
      return fetch(e.request).then(function(networkRes) {
        putToCache(e.request, networkRes);
        return networkRes;
      }).catch(function() {
        return caches.match('./index.html');
      });
    })
  );
});