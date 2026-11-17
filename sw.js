/* Beam Beam — service worker (by H24 Creationz)
   Keep this file next to index.html. Pages are network-first so a new
   deploy shows up immediately; the cached copy is used only offline. */
const CACHE = 'beambeam-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg',
  './lib/mqtt.min.js', './lib/qrcode.js', './lib/jsQR.js',
  './fonts/bricolage-grotesque-latin-700-normal.woff2', './fonts/bricolage-grotesque-latin-800-normal.woff2',
  './fonts/figtree-latin-400-normal.woff2', './fonts/figtree-latin-500-normal.woff2', './fonts/figtree-latin-600-normal.woff2', './fonts/figtree-latin-700-normal.woff2',
  './beambeam-icon-192.png', './beambeam-icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE && k !== 'bb-share').map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);

  // Android share sheet → Beam Beam: keep the files, then open the app with them
  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      let n = 0;
      try {
        const fd = await req.formData(); const c = await caches.open('bb-share');
        for (const f of fd.getAll('files')) {
          if (!f || typeof f === 'string') continue;
          await c.put(new Request(new URL('./__shared/' + Date.now() + '-' + (n++), self.registration.scope)),
            new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name || 'file') } }));
        }
      } catch (err) {}
      return Response.redirect(new URL('./?app&shared=' + n, self.registration.scope).href, 303);
    })());
    return;
  }
  if (req.method !== 'GET' || !/^https?:/.test(url.protocol)) return;
  if (url.origin !== self.location.origin) return;            // relays, GitHub API: always live
  if (/\/media\//.test(url.pathname)) return;                 // videos and screenshots: browser cache only

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh.ok) { const c = await caches.open(CACHE); c.put('./index.html', fresh.clone()).catch(() => {}); }
        return fresh;
      } catch (err) {
        return (await caches.match('./index.html')) || (await caches.match('./')) ||
          new Response('<h1>You’re offline</h1><p>Connect to the internet to send or receive files.</p>', { headers: { 'Content-Type': 'text/html' }, status: 503 });
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const net = fetch(req).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())).catch(() => {}); return res; }).catch(() => null);
    return cached || (await net) || Response.error();
  })());
});
