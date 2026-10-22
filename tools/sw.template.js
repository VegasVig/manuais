const VERSAO = '__VERSAO__';
const CACHE_APP = 'manuais-app-' + VERSAO;
const CACHE_PDF = 'manuais-pdf-v1';
const SHELL = __SHELL__;
const FIGURAS = __FIGURAS__;

self.addEventListener('install', (ev) => {
  ev.waitUntil((async () => {
    const cache = await caches.open(CACHE_APP);
    await cache.addAll(SHELL);
    const total = FIGURAS.length;
    let feitos = 0;
    const canal = new BroadcastChannel('manuais-sw');
    for (let i = 0; i < total; i += 12) {
      await Promise.all(FIGURAS.slice(i, i + 12).map((u) => cache.add(u).catch(() => {})));
      feitos = Math.min(total, i + 12);
      canal.postMessage({ tipo: 'progresso', feitos, total });
    }
    canal.postMessage({ tipo: 'pronto', versao: VERSAO });
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n.startsWith('manuais-app-') && n !== CACHE_APP).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (ev) => {
  if (ev.data && ev.data.tipo === 'baixar-pdfs') {
    ev.waitUntil((async () => {
      const cache = await caches.open(CACHE_PDF);
      const canal = new BroadcastChannel('manuais-sw');
      const lista = ev.data.urls || [];
      for (let i = 0; i < lista.length; i++) {
        try { await cache.add(lista[i]); } catch (e) {}
        canal.postMessage({ tipo: 'pdf', feitos: i + 1, total: lista.length });
      }
    })());
  }
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.endsWith('.pdf')) {
    ev.respondWith((async () => {
      const cache = await caches.open(CACHE_PDF);
      const limpo = new Request(url.origin + url.pathname);
      const hit = await cache.match(limpo);
      if (hit) return hit;
      const resp = await fetch(limpo);
      if (resp.ok) cache.put(limpo, resp.clone());
      return resp;
    })());
    return;
  }

  if (url.pathname.endsWith('.mp4') || url.pathname.endsWith('.webm')) return;

  ev.respondWith((async () => {
    const cache = await caches.open(CACHE_APP);
    const hit = await cache.match(req, { ignoreSearch: true });
    const rede = fetch(req).then((resp) => {
      if (resp.ok && resp.type === 'basic') cache.put(url.origin + url.pathname, resp.clone());
      return resp;
    }).catch(() => null);
    if (hit) { ev.waitUntil(rede); return hit; }
    const resp = await rede;
    if (resp) return resp;
    if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
    return Response.error();
  })());
});
