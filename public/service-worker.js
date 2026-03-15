// ═══════════════════════════════════════════════════════════════════════════
// ExamAce AI — Service Worker (PWA Offline Support)
// Strategy:
//   - App shell (HTML/CSS/JS) → Cache First
//   - API /api/questions → Stale-While-Revalidate (serve cached, update in bg)
//   - API /api/chat      → Network First (always try fresh AI answers)
//   - Images             → Cache First
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_NAME    = "examace-v1";
const QUESTION_CACHE = "examace-questions-v1";
const STATIC_CACHE  = "examace-static-v1";

// App shell files to pre-cache on install
const APP_SHELL = [
  "/",
  "/index.html",
  "/static/js/main.chunk.js",
  "/static/js/bundle.js",
  "/static/css/main.chunk.css",
  "/manifest.json",
];

// ── INSTALL: Pre-cache the app shell ──────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Installing ExamAce service worker...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Pre-cache what we can, silently skip what's missing
      return Promise.allSettled(
        APP_SHELL.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: Clean up old caches ─────────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => ![CACHE_NAME, QUESTION_CACHE, STATIC_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Route requests to the right strategy ───────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // ── /api/questions → Stale-While-Revalidate ──────────────────────────
  // Serve cached questions instantly (fast offline), update in background
  if (url.pathname.startsWith("/api/questions")) {
    event.respondWith(staleWhileRevalidate(request, QUESTION_CACHE));
    return;
  }

  // ── /api/chat → Network First (AI needs fresh responses) ─────────────
  // Falls back to a generic offline message if network is unavailable
  if (url.pathname.startsWith("/api/chat")) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // ── Everything else → Cache First (app shell, static assets) ─────────
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// ── STRATEGY: Cache First ─────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return a simple offline page for navigation requests
    if (request.mode === "navigate") {
      return new Response(offlinePage(), {
        headers: { "Content-Type": "text/html" },
      });
    }
    return new Response("Offline", { status: 503 });
  }
}

// ── STRATEGY: Stale-While-Revalidate ─────────────────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Start a network fetch in background (update cache for next time)
  const networkPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Return cached immediately if available, otherwise wait for network
  if (cached) {
    // Silently update cache in background
    networkPromise;
    return cached;
  }

  // No cache — wait for network
  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;

  // Both failed — return offline JSON
  return new Response(
    JSON.stringify({ questions: [], meta: { error: "Offline", alocCount: 0, aiCount: 0 } }),
    { headers: { "Content-Type": "application/json" }, status: 503 }
  );
}

// ── STRATEGY: Network First with Fallback ─────────────────────────────────
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    // Return a friendly offline AI response
    return new Response(
      JSON.stringify({
        content: [{
          type: "text",
          text: "⚠️ You appear to be offline. ExamAce AI needs internet to answer questions. Please check your connection and try again.\n\n📚 **While offline, you can still:**\n- Review your saved quiz history\n- Practice with previously loaded questions\n- Check your spaced repetition reviews"
        }],
        source: "Offline"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}

// ── OFFLINE PAGE ──────────────────────────────────────────────────────────
function offlinePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ExamAce AI — Offline</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0b0d14; color: #f1f5f9; font-family: 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #13151f; border: 1px solid #252838; border-radius: 20px; padding: 32px; max-width: 360px; text-align: center; }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 900; color: #f5c842; margin-bottom: 8px; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.7; margin-bottom: 16px; }
    .tip { background: #1a1d2a; border-radius: 12px; padding: 14px; text-align: left; margin-bottom: 20px; }
    .tip div { font-size: 13px; color: #94a3b8; line-height: 1.8; }
    button { background: #f5c842; border: none; border-radius: 12px; padding: 14px 28px; color: #000; font-weight: 800; font-size: 14px; cursor: pointer; font-family: inherit; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📵</div>
    <h1>You're Offline</h1>
    <p>ExamAce AI needs internet to load questions and AI responses.</p>
    <div class="tip">
      <div>📚 While offline you can still:</div>
      <div>• Review past quiz history</div>
      <div>• Practice spaced repetition reviews</div>
      <div>• Check weak topics you've saved</div>
    </div>
    <button onclick="window.location.reload()">🔄 Try Again</button>
  </div>
</body>
</html>`;
}