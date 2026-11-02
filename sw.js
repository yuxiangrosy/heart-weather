const CACHE = 'heart-weather-v0.1.2-icon-v2';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icons/icon-192-mood-v2.png','./icons/icon-512-mood-v2.png','./icons/apple-touch-icon-mood-v2.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
      return response;
    }))
  );
});
