const CACHE_NAME = "offline-cache-v1";
const API_CACHE_NAME = "api-cache-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll([
          "/",
          "/index.html",
          "/assets/index-*.js",
          "/assets/index-*.css",
        ])
      )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests
  if (url.pathname.startsWith("/api/")) {
    if (!navigator.onLine) {
      // Offline - try to get from cache
      event.respondWith(
        caches.match(request).then((response) => {
          if (response) {
            return response;
          }
          return new Response(
            JSON.stringify({ error: "Offline - No cached data available" }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        })
      );
    } else {
      // Online - network first, fallback to cache
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Clone the response to store in cache
            const responseToCache = response.clone();
            caches
              .open(API_CACHE_NAME)
              .then((cache) => cache.put(request, responseToCache));
            return response;
          })
          .catch(() => caches.match(request))
      );
    }
  } else {
    // Static assets - cache first
    event.respondWith(
      caches.match(request).then((response) => response || fetch(request))
    );
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
