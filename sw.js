const CACHE = 'vocab-app-shell-v1';
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

// App shell: cache-first. Everything else (Supabase, fonts, esm.sh): network-first, no caching of data.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if(SHELL.includes(url.pathname)){
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
  // else: let it hit the network normally (don't intercept API/data calls)
});
