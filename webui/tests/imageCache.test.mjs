import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { IMAGE_CACHE_NAME, cacheUploadedImage, matchImage, pruneImages, reconcileImageCache, storeImage } from '../src/utils/imageCache.js';

const entries = new Map();
const urlOf = (key) => typeof key === 'string' ? key : key.url;
beforeEach(() => {
  entries.clear();
  globalThis.caches = { open: async (name) => {
    assert.equal(name, IMAGE_CACHE_NAME);
    return {
      keys: async () => [...entries.keys()].map((url) => new Request(url)),
      match: async (key) => entries.get(urlOf(key))?.clone(),
      put: async (key, response) => entries.set(urlOf(key), response.clone()),
      delete: async (key) => entries.delete(urlOf(key)),
    };
  } };
});
afterEach(() => { delete globalThis.caches; });

const image = (text, expires = Date.now() + 60000) => new Response(text, {
  headers: { 'Content-Type': 'image/png', 'X-ArkDrop-Expires-At': String(expires) },
});

test('uploaded image is reused locally, with the exact uploaded bytes and expiry', async () => {
  const file = new File(['uploaded image'], 'photo.png', { type: 'image/png' });
  const expiry = Math.floor(Date.now() / 1000) + 60;
  await cacheUploadedImage({ file_path: 'photo.png' }, file, expiry);
  const cached = await matchImage('/files/photo.png');
  assert.equal(await cached.text(), 'uploaded image');
  assert.equal(await matchImage('/files/photo.png', expiry * 1000), null);
  assert.equal(entries.size, 0);
});

test('images without a lifetime and non-images are not cached', async () => {
  await storeImage('/files/no-expiry', new Response('image', { headers: { 'Content-Type': 'image/png' } }));
  await storeImage('/files/text', new Response('text', { headers: { 'Content-Type': 'text/plain', 'X-ArkDrop-Expires-At': String(Date.now() + 60000) } }));
  assert.equal(entries.size, 0);
});

test('capacity pruning removes least recently used image first', async () => {
  await storeImage('/files/one', image('111'));
  await storeImage('/files/two', image('222'));
  await matchImage('/files/one');
  await pruneImages(undefined, 3);
  assert.equal(await matchImage('/files/two'), null);
  assert.equal(await (await matchImage('/files/one')).text(), '111');
});

test('authoritative sync removes deleted images and updates expiry after unstar', async () => {
  await storeImage('/files/deleted', image('deleted'));
  await storeImage('/files/remaining', image('remaining'));
  const created = Math.floor(Date.now() / 1000);
  await reconcileImageCache([{ created_at: created, favorite: false, attachments: [{ file_path: 'remaining' }] }], 10);
  assert.equal(await matchImage('/files/deleted'), null);
  const cached = await matchImage('/files/remaining');
  assert.equal(Number(cached.headers.get('X-ArkDrop-Expires-At')), (created + 10) * 1000);
  await reconcileImageCache([], 10);
  assert.equal(entries.size, 0);
});
