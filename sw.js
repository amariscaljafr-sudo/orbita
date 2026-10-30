// Órbita — caché sin conexión. Sube VERSION al publicar cambios.
const VERSION = "orbita-v28";
const MP_CACHE = "orbita-mp-1.1.1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== MP_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Página: red primero para recibir actualizaciones, caché si no hay conexión.
  if (req.mode === "navigate"){
    e.respondWith(fetch(req, {cache:"no-store"}).then(r => { const c = r.clone(); caches.open(VERSION).then(k => k.put("./index.html", c)); return r; }).catch(() => caches.match("./index.html")));
    return;
  }
  // Resto (iconos, fuentes, librería 3D): caché primero y se refresca en segundo plano.
  if (url.pathname.endsWith("version.txt")) return;
  // Recortador de fondo (MediaPipe): se descarga una vez y se queda guardado.
  if (/@mediapipe\/tasks-vision@|mediapipe-models\//.test(url.href)){
    e.respondWith(caches.open(MP_CACHE).then(async c => (await c.match(req)) || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  const cacheable = url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.host);
  if (!cacheable) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
