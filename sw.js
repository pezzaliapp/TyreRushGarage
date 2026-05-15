/* ============================================================
   sw.js V3 - Service Worker offline-first con AUTO UPDATE.
   Cache bumpata: tyrerush-v3.0.0
   Strategia: network-first per HTML/JS (così le nuove versioni
   passano sempre quando online), cache-first per asset binari.
   Manda messaggio "sw-updated" ai client per refresh trasparente.
   ============================================================ */

const CACHE = 'tyrerush-v3.0.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/main.js',
  './js/storage.js',
  './js/audio.js',
  './js/fx.js',
  './js/customers.js',
  './js/events.js',
  './js/achievements.js',
  './js/levels.js',
  './js/upgrades.js',
  './js/games/smontagomme.js',
  './js/games/equilibratura.js',
  './js/games/gonfiaggio.js',
  './js/games/assetto.js',
  './js/games/bosstruck.js',
  './js/games/manopump.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
    .then(async () => {
      // notifica i client già aperti che è arrivata una nuova versione
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach((c) => c.postMessage({ type: 'sw-updated', version: CACHE }));
    })
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Cross-origin (CDN, fonts) → lascia stare
  if (url.origin !== location.origin) return;

  const isHTMLorJS = (req.headers.get('accept') || '').includes('text/html')
    || req.mode === 'navigate'
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('.js')
    || url.pathname.endsWith('.css');

  if (isHTMLorJS) {
    // network-first: prende la versione fresca quando online, fallback cache
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // cache-first per asset binari
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
