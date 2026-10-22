import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterUnexpired, pruneListCaches, LIST_CACHE_MAX_AGE, clearArkDropPWACaches } from '../src/utils/clientCache.js';

test('expired temporary records disappear, favorites and unexpired records remain', () => {
  const records = [{ id: 1, created_at: 10 }, { id: 2, created_at: 25 }, { id: 3, created_at: 0, favorite: true }];
  assert.deepEqual(filterUnexpired(records, 10, 20000).map((r) => r.id), [2, 3]);
  assert.equal(filterUnexpired(records, 0, 20000).length, 3);
});

test('pruning removes stale/corrupt caches and expired metadata without extending cache lifetime', () => {
  const now = 2000000;
  const key = 'arkdrop-list-cache:';
  const values = {
    [`${key}all`]: JSON.stringify({ updatedAt: now - 1000, expireSeconds: 10, list: [{ created_at: 1 }, { created_at: 1999 }] }),
    [`${key}favorite`]: JSON.stringify({ updatedAt: now - LIST_CACHE_MAX_AGE, list: [] }),
    [`${key}bad`]: '{',
    preference: 'keep',
  };
  globalThis.localStorage = Object.assign(values, {
    getItem(k) { return this[k] ?? null; },
    setItem(k, v) { this[k] = v; },
    removeItem(k) { delete this[k]; },
  });
  pruneListCaches(now);
  const result = JSON.parse(values[`${key}all`]);
  assert.equal(result.updatedAt, now - 1000);
  assert.equal(result.list.length, 1);
  assert.equal(values[`${key}favorite`], undefined);
  assert.equal(values[`${key}bad`], undefined);
  assert.equal(values.preference, 'keep');
  delete globalThis.localStorage;
});

test('legacy payload cache cleanup preserves app shell and unrelated caches', async () => {
  const deleted = [];
  globalThis.window = { caches: {} };
  globalThis.caches = {
    keys: async () => ['arkdrop-api-list', 'arkdrop-file-images', 'arkdrop-images-v2', 'workbox-precache-v2', 'other-app'],
    delete: async (key) => deleted.push(key),
  };
  await clearArkDropPWACaches();
  assert.deepEqual(deleted, ['arkdrop-api-list', 'arkdrop-file-images', 'arkdrop-images-v2']);
  delete globalThis.window;
  delete globalThis.caches;
});
