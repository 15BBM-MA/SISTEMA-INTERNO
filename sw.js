// Service Worker — Sistema 15º BBM (PWA)
const CACHE = 'bbm-v1';
const ASSETS = [
  './', './index.html', './login.html', './trocar-senha.html',
  './assets/css/main.css', './assets/js/main.js', './assets/img/logo.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Network-first p/ navegação/HTML (sempre versão atual); cache-first p/ assets estáticos.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // não interceptar chamadas externas (Supabase, CDN)
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(fetch(req).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
      return res;
    }).catch(()=>cached))
  );
});
