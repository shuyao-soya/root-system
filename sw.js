const CACHE = 'vocab-app-shell-v2';
const SHELL = ['/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {})
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 首页和 index.html 使用网络优先，避免一直显示旧版本
  if (
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/index.html'
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();

          caches
            .open(CACHE)
            .then((cache) => cache.put('/index.html', copy));

          return response;
        })
        .catch(() => caches.match('/index.html'))
    );

    return;
  }

  // manifest 使用缓存优先
  if (SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          const copy = response.clone();

          caches
            .open(CACHE)
            .then((cache) => cache.put(request, copy));

          return response;
        });
      })
    );
  }

  // Supabase、字体、esm.sh 等其他请求不拦截
});
