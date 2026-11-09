/* Traccia Giusta · service worker: apre l'app anche senza connessione */
const VERSIONE = "tg-1.0.0";
const BASE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-192.png", "./icon-maskable-512.png", "./apple-touch-icon.png", "./favicon-32.png", "./logo.svg"];
const LIBRERIE = ["https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css", "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js", "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(BASE).then(() => Promise.all(LIBRERIE.map(u => c.add(new Request(u, { mode: "cors" })).catch(() => {}))))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== VERSIONE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (new URL(e.request.url).pathname.endsWith('version.json')) return; // controllo aggiornamenti: sempre dalla rete

  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // pagina: prima la rete (così arrivano gli aggiornamenti), senza rete la copia salvata
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSIONE).then(x => x.put("./index.html", c)); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // icone, librerie e caratteri: prima la copia salvata
  const statico = url.origin === location.origin || url.hostname === "cdnjs.cloudflare.com" || url.hostname.endsWith("gstatic.com") || url.hostname === "fonts.googleapis.com";
  if (statico) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === "opaque") { const c = r.clone(); caches.open(VERSIONE).then(x => x.put(req, c)); }
      return r;
    })));
  }
  // dati di OpenStreetMap, quote e mappe: sempre dalla rete
});

// Tasto "Aggiorna": attiva subito la nuova versione
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
