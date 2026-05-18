const CACHE_VERSION = 'v4.7';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const OFFLINE_URL = './offline.html';

const PRECACHE_URLS = [
  './',
  './index.html',
  './tailwind.css?v=4.7',
  './styles.css?v=4.7',
  './app.js?v=4.7',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/icon-180.png',
  './icons/marketintel-mark.png',
  './icons/marketintel-logo.png',
  './photo assets/906-Real-Estate-Group_Logo-2024_Black.png',
  './photo assets/CBlobo.png',
  OFFLINE_URL
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
      return response;
    });
  });
}

function shouldUseNetworkFirst(url, request) {
  return (
    request.mode === 'navigate' ||
    ['script', 'style', 'worker'].includes(request.destination) ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('/manifest.json')
  );
}

function networkFirst(request) {
  return fetch(request).then((response) => {
    const copy = response.clone();
    caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
    return response;
  }).catch(() => caches.match(request));
}

function staleWhileRevalidate(request) {
  return caches.match(request).then((cached) => {
    const networkFetch = fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => cached);

    return cached || networkFetch;
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    return;
  }

  if (url.origin === self.location.origin) {
    if (shouldUseNetworkFirst(url, request)) {
      event.respondWith(
        networkFirst(request).then((response) => response || caches.match(OFFLINE_URL))
      );
      return;
    }

    event.respondWith(
      cacheFirst(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  const cdnHosts = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com',
    'cdn.jsdelivr.net'
  ];

  if (cdnHosts.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
