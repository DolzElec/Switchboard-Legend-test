/* Switchboard Legend service worker — app-shell offline (V3.18) */
const CACHE = 'sbl-v4.2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(PRECACHE.map(u => c.add(u)))));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url; try { url = new URL(req.url); } catch (_) { return; }
  if (url.hostname.endsWith('supabase.co')) return; // data handled by the app's offline layer
  const accept = req.headers.get('accept') || '';
  if (req.mode === 'navigate' || accept.includes('text/html')) {
    // network-first so online users always get fresh deploys; cached shell when offline
    e.respondWith(
      fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put('./index.html', c)); return r; })
                .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }
  // static assets (icons, qr lib): cache-first
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      if (resp && (resp.ok || resp.type === 'opaque')) { const c = resp.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); }
      return resp;
    }).catch(() => cached))
  );
});
