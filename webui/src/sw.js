import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { matchImage, storeImage, pruneImages } from './utils/imageCache';

clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/api\//, /^\/files\//, /^\/share\//] }));
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

const inFlight = new Map();
registerRoute(
  ({ url, request }) => url.origin === self.location.origin && url.pathname.startsWith('/files/')
    && request.method === 'GET' && !request.headers.has('Range'),
  async ({ request, event }) => {
    let cached;
    try { cached = await matchImage(request.url); } catch { /* Storage may be unavailable. */ }
    if (cached) return cached;
    if (!inFlight.has(request.url)) {
      const transfer = fetch(new Request(request, { cache: 'no-store' })).then((response) => {
        event.waitUntil(storeImage(request.url, response.clone()).catch(() => {}));
        return response;
      }).finally(() => inFlight.delete(request.url));
      inFlight.set(request.url, transfer);
    }
    return (await inFlight.get(request.url)).clone();
  }
);
self.addEventListener('activate', (event) => event.waitUntil(pruneImages().catch(() => {})));
