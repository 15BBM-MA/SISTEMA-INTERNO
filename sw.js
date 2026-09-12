// Service Worker — Sistema 15º BBM (PWA)
// Estratégia: REDE PRIMEIRO (sempre a versão mais nova online); cache só como
// reserva para funcionar offline. Assim atualizações aparecem na hora.
const CACHE = 'bbm-v6';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // não intercepta Supabase/CDN

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});

// ── Notificações push ─────────────────────────────────────────────
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'Sistema 15º BBM';
  const opts = {
    body: d.body || '',
    icon: './assets/img/logo.png',
    badge: './assets/img/logo.png',
    lang: 'pt-BR',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || 'index.html' },
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  // resolve o destino relativo ao escopo do app (funciona no subcaminho do GitHub Pages)
  const alvo = new URL((e.notification.data && e.notification.data.url) || 'index.html', self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if (c.url === alvo && 'focus' in c) return c.focus(); }
      for (const c of list) { if (c.url.startsWith(self.registration.scope) && 'focus' in c) { c.navigate(alvo); return c.focus(); } }
      return self.clients.openWindow(alvo);
    })
  );
});
