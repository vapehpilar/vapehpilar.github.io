/* VHP · Service worker
   Hace que la tienda se pueda instalar y que abra aunque no haya señal.
   - Páginas, estilos y scripts: primero la red (así siempre se ven los cambios),
     y si no hay conexión, la última copia guardada.
   - Fotos y fuentes: la copia guardada (cargan al instante) y se actualizan por detrás.
   Para forzar que todos bajen todo de nuevo, cambiá VERSION. */
var VERSION = "vhp-1";
var CORE = ["./", "index.html", "css/styles.css", "css/efectos.css", "js/productos.js", "js/app.js", "js/efectos.js",
  "fonts/hanken-grotesk.woff2", "fonts/unbounded.woff2", "img/logo-letras.webp", "img/logo-sm.webp", "img/favicon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return; // WhatsApp, analíticas, etc.: directo a la red
  var isAsset = /\.(webp|png|jpe?g|woff2)$/.test(url.pathname);
  if (isAsset) {
    e.respondWith(caches.open(VERSION).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; })
          .catch(function () { return hit || Response.error(); });
        return hit || net;
      });
    }));
    return;
  }
  e.respondWith(fetch(req).then(function (res) {
    if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (hit) { return hit || caches.match("index.html"); });
  }));
});
