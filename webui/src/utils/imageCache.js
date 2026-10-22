// Shared by the page and service worker. Cache only complete image responses.
export const IMAGE_CACHE_NAME = 'arkdrop-images-v2';
export const IMAGE_CACHE_LIMIT = 100 * 1024 * 1024;
const EXPIRY_HEADER = 'X-ArkDrop-Expires-At';
const SIZE_HEADER = 'X-ArkDrop-Cache-Size';
let queue = Promise.resolve();

const serialize = (task) => {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
};
const supported = () => typeof caches !== 'undefined';
const absoluteURL = (path) => new URL(path, globalThis.location?.origin || 'http://localhost').href;

export const pruneImages = async (validPaths, limit = IMAGE_CACHE_LIMIT, now = Date.now()) => {
  if (!supported()) return;
  return serialize(async () => {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const allowed = validPaths ? new Set(validPaths.map(absoluteURL)) : null;
    const entries = [];
    let total = 0;
    for (const request of await cache.keys()) {
      const response = await cache.match(request);
      const expiry = Number(response?.headers.get(EXPIRY_HEADER));
      const size = Number(response?.headers.get(SIZE_HEADER));
      if (!expiry || expiry <= now || !size || (allowed && !allowed.has(request.url))) {
        await cache.delete(request);
      } else {
        total += size;
        entries.push({ request, size });
      }
    }
    // Cache keys retain insertion order; a hit is moved to the end below.
    for (const { request, size } of entries) {
      if (total <= limit) break;
      await cache.delete(request);
      total -= size;
    }
  });
};

export const matchImage = async (path, now = Date.now()) => {
  if (!supported()) return null;
  return serialize(async () => {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const url = absoluteURL(path);
    const response = await cache.match(url);
    if (!response) return null;
    if (Number(response.headers.get(EXPIRY_HEADER)) <= now || !response.headers.has(EXPIRY_HEADER)) {
      await cache.delete(url);
      return null;
    }
    await cache.delete(url);
    await cache.put(url, response.clone());
    return response;
  });
};

export const storeImage = async (path, response) => {
  if (!supported() || response.status !== 200 || !response.headers.get('Content-Type')?.startsWith('image/')) return;
  const expiry = Number(response.headers.get(EXPIRY_HEADER));
  if (!expiry || expiry <= Date.now()) return;
  const blob = await response.blob();
  if (!blob.size || blob.size > IMAGE_CACHE_LIMIT) return;
  const headers = new Headers(response.headers);
  // Stored bodies are decoded bytes, including files inserted directly after upload.
  headers.delete('Content-Encoding');
  headers.delete('Content-Length');
  headers.set(SIZE_HEADER, String(blob.size));
  await serialize(async () => {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const url = absoluteURL(path);
    await cache.delete(url);
    await cache.put(url, new Response(blob, { headers }));
  });
  await pruneImages();
};

export const cacheUploadedImage = async (attachment, file, expiresAt) => {
  if (!attachment || !file.type.startsWith('image/') || !expiresAt) return;
  await storeImage(`/files/${attachment.file_path}`, new Response(file, { headers: {
    'Content-Type': file.type,
    [EXPIRY_HEADER]: String(expiresAt * 1000),
  } }));
};

export const reconcileImageCache = async (list, expireSeconds) => {
  if (!supported()) return;
  const records = new Map();
  for (const parcel of list) {
    const expiry = parcel.favorite || !expireSeconds
      ? Date.now() + 24 * 60 * 60 * 1000
      : (parcel.created_at + expireSeconds) * 1000;
    for (const file of parcel.attachments || []) records.set(absoluteURL(`/files/${file.file_path}`), expiry);
  }
  // Update expiry when a record is starred/unstarred without downloading its image again.
  await serialize(async () => {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    for (const request of await cache.keys()) {
      const expiry = records.get(request.url);
      if (!expiry || expiry <= Date.now()) {
        await cache.delete(request);
        continue;
      }
      const response = await cache.match(request);
      const headers = new Headers(response.headers);
      headers.set(EXPIRY_HEADER, String(expiry));
      await cache.put(request, new Response(response.body, { headers }));
    }
  });
  await pruneImages([...records.keys()]);
};
