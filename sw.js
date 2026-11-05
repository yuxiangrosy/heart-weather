/* Static shell only. IndexedDB is NEVER deleted by this service worker. */
const CACHE = 'heart-weather-shell-v0.3.0';
const ASSETS = [
  './','./index.html','./styles.css','./app.js','./letters.js','./manifest.webmanifest',
  './icons/icon-192-mood-v2.png','./icons/icon-512-mood-v2.png',
  './icons/apple-touch-icon-mood-v2.png'
];
const scope = self.registration.scope;
const inScope = url => url.origin === self.location.origin && url.href.startsWith(scope);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS.map(path=>new Request(new URL(path,scope),{cache:'reload'})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('heart-weather-') && name!==CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET' || !inScope(new URL(event.request.url)))return;
  if(event.request.mode==='navigate'){
    event.respondWith((async () => {
      try{
        const response=await fetch(event.request);
        if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(new URL('./index.html',scope),copy)));return response;}
        return (await caches.match(new URL('./index.html',scope)))||response;
      }catch{
        return (await caches.match(new URL('./index.html',scope)))||Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const match=await caches.match(event.request);
    if(match)return match;
    const response=await fetch(event.request);
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}
    return response;
  })());
});
