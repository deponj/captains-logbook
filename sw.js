// Service Worker — network-first for our own app files (so updates land
// immediately on refresh), cache-first for vendor/fonts. Bump CACHE on deploy.
const CACHE = 'captains-logbook-v5';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './stamp-time.js',
  './db.js',
  './airports.js',
  './fleet-policy.js',
  './aircraft.js',
  './night.js',
  './manifest.json',
  './vendor/dexie.min.js',
  './vendor/suncalc.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isVendor = sameOrigin && url.pathname.includes('/vendor/');

  if (sameOrigin && !isVendor) {
    // Network-first: always try the network for shell files; fall back to cache offline.
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first: vendor + cross-origin assets (fonts).
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }))
    );
  }
});
