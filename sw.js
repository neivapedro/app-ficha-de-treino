// Service worker: guarda o app no aparelho para funcionar 100% offline.
const CACHE = 'ficha-de-treino-v4';
const ARQUIVOS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Rede primeiro (até 2,5 s) para sempre pegar a versão nova; sem rede ou com rede lenta, usa o cache.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    new Promise((resolve) => {
      const emCache = () => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'));
      const timer = setTimeout(() => emCache().then(resolve), 2500);
      fetch(e.request).then((res) => {
        clearTimeout(timer);
        if (res && res.ok && new URL(e.request.url).origin === location.origin) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        resolve(res);
      }).catch(() => { clearTimeout(timer); emCache().then(resolve); });
    })
  );
});
