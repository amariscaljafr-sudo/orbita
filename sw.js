// Órbita — caché sin conexión. Sube VERSION al publicar cambios.
const VERSION = "orbita-v8";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Página: red primero para recibir actualizaciones, caché si no hay conexión.
  if (req.mode === "navigate"){
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(k => k.put("./index.html", c)); return r; }).catch(() => caches.match("./index.html")));
    return;
  }
  // Resto (iconos, fuentes, librería 3D): caché primero y se refresca en segundo plano.
  const cacheable = url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.host);
  if (!cacheable) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
