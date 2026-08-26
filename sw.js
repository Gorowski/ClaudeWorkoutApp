/* Service worker: makes the app open with no network at all.

   The gym is a concrete box. If the app needs a signal to show you what you
   lifted last Tuesday, it is useless exactly when you need it. So every file
   is cached on install and served from cache first.

   Bump CACHE when you change any file below, or browsers will keep serving
   the old copy. */

const CACHE = 'nucs-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles/app.css',
  './src/main.js',
  './src/store.js',
  './src/session.js',
  './src/dates.js',
  './src/util.js',
  './src/views/session.js',
  './src/views/calendar.js',
  './src/views/program.js',
  './src/views/reference.js',
  './data/program.seed.json',
  './data/log.seed.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Fonts come from Google and are immutable once fetched: serve from cache,
  // fill the cache on first success, and simply do without when offline.
  if (url.origin !== self.location.origin) {
    ev.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => hit))
    );
    return;
  }

  // Own files: cache first, then network, falling back to the shell so a
  // deep link still opens a working app offline.
  ev.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
