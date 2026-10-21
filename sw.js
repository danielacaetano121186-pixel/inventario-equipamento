// Inventário de equipamento: guarda a ferramenta no iPhone para abrir sem internet.
// Só guarda a página da ferramenta. Não guarda nem envia os equipamentos lidos.
const CACHE = 'inventario-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add('./')).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Abre a cópia guardada (rápido e sem internet) e, ao mesmo tempo, vai buscar a versão nova para a próxima vez
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || e.request.mode !== 'navigate') return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const guardada = await c.match('./');
    const rede = fetch('./', { cache: 'no-cache' }).then((r) => {
      if (r.ok) c.put('./', r.clone());
      return r;
    });
    if (guardada) {
      e.waitUntil(rede.catch(() => {}));
      return guardada;
    }
    return rede;
  }));
});
