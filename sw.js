const CACHE_NAME = 'bucovice-v4';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;

  // Přeskoč non-GET requesty (HEAD, POST atd.) — Cache API je nepodporuje
  if(req.method !== 'GET') return;

  // Přeskoč cross-origin requesty (Gemini API, Firebase atd.)
  if(!req.url.startsWith(self.location.origin)) return;

  // Přeskoč cache-busting URL (auto-update check)
  if(req.url.includes('?_=')) return;

  e.respondWith(
    caches.match(req).then(cached => {
      if(cached) return cached;
      return fetch(req).then(resp => {
        if(resp && resp.status === 200 && resp.type === 'basic'){
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return resp;
      }).catch(() => new Response('Offline', {status: 503}));
    })
  );
});
