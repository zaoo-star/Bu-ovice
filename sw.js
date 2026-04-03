const CACHE_NAME = 'bucovice-v5';

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

  if(req.method !== 'GET') return;
  if(!req.url.startsWith(self.location.origin)) return;
  if(req.url.includes('?_=')) return;

  // HTML soubory: network-first — vždy čerstvé ze serveru, cache jen jako offline fallback
  const url = new URL(req.url);
  const isHtml = req.headers.get('accept')?.includes('text/html')
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('/')
    || url.pathname === '/Bu-ovice'
    || url.pathname === '/Bu-ovice/';

  if(isHtml){
    e.respondWith(
      fetch(req, {cache: 'no-store'})
        .then(resp => {
          if(resp && resp.status === 200){
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return resp;
        })
        .catch(() => caches.match(req).then(cached => cached || new Response('Offline', {status: 503})))
    );
    return;
  }

  // Ostatní assety (obrázky, fonty, JS): cache-first
  e.respondWith(
    caches.match(req).then(cached => {
      if(cached) return cached;
      return fetch(req).then(resp => {
        if(resp && resp.status === 200 && resp.type === 'basic'){
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return resp;
      }).catch(() => new Response('Offline', {status: 503}));
    })
  );
});
