const CACHE = 'vocab-app-shell-v2'; // 每次你想强制所有设备拿到最新版本，就把这个版本号改一下
const SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// App shell: 网络优先，拿不到网络才退回缓存（离线兜底）。
// 这样每次重新部署，用户下次打开就能拿到最新代码，而不是卡在旧缓存里。
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if(SHELL.includes(url.pathname)){
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, resClone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
  // 其余请求（Supabase 数据、字体、esm.sh 等）：不拦截，走正常网络请求
});
