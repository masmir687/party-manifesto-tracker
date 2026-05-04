const CACHE_NAME = 'wb2026-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './promises.json',
  './aitmc_promises.json',
  './config.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
