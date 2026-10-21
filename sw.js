// Inventário de equipamento: guarda a página no iPhone para funcionar sem rede.
// Abre sempre a cópia guardada (rápido e sem rede). Com rede, procura em segundo plano
// uma versão nova; se houver, guarda-a e avisa a página.
var CACHE = 'inventario-v14';
var FICHEIROS = ['./', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', function (ev) {
  ev.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FICHEIROS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function marca(r) { return r ? (r.headers.get('etag') || r.headers.get('last-modified') || '') : ''; }

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET') return;
  // Só trata a página do inventário e os seus ficheiros. As outras pastas do site (cuco, resultados...) ficam como estão.
  var url = new URL(req.url), base = self.registration.scope;
  var limpo = url.origin + url.pathname;
  var pagina = limpo === base || limpo === base + 'index.html';
  var meu = pagina || FICHEIROS.some(function (f) { return f !== './' && limpo === new URL(f, base).href; });
  if (!meu) return;
  var chave = pagina ? new Request(self.registration.scope) : req;
  ev.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(chave, { ignoreSearch: true }).then(function (guardada) {
      var rede = fetch(pagina ? self.registration.scope : req, { cache: 'no-cache' }).then(function (nova) {
        if (nova && nova.ok) {
          var mudou = guardada && marca(guardada) !== marca(nova);
          return c.put(chave, nova.clone()).then(function () {
            if (pagina && mudou) {
              self.clients.matchAll().then(function (cs) { cs.forEach(function (cl) { cl.postMessage('nova-versao'); }); });
            }
            return nova;
          });
        }
        return nova;
      });
      if (guardada) { ev.waitUntil(rede.catch(function () {})); return guardada; }
      return rede;
    });
  }));
});
