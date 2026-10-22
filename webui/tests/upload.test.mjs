import { test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { uploadAttachment } from '../src/utils/upload.js';

test('retry confirms a lost success response without resending file bytes', async () => {
  const adapter = axios.defaults.adapter;
  const calls = [];
  axios.defaults.adapter = async (config) => {
    calls.push(config);
    return { data: { attachments: [{ id: 1, file_path: 'file' }], expires_at: 0 }, status: 200, headers: {}, config };
  };
  try {
    await uploadAttachment({ parcelId: 7, file: new File(['bytes'], 'a.txt'), key: 'stable-upload-key' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'get');
    assert.equal(calls[0].headers.get('X-Upload-Key'), 'stable-upload-key');
  } finally { axios.defaults.adapter = adapter; }
});

test('missing upload posts once with same key; first attempt skips status lookup', async () => {
  const adapter = axios.defaults.adapter;
  const calls = [];
  axios.defaults.adapter = async (config) => {
    calls.push(config);
    return { data: { attachments: config.method === 'get' ? [] : [{ id: 1 }], expires_at: 0 }, status: 200, headers: {}, config };
  };
  try {
    const args = { parcelId: 7, file: new File(['bytes'], 'a.txt'), key: 'stable-upload-key' };
    await uploadAttachment(args);
    assert.deepEqual(calls.map((c) => c.method), ['get', 'post']);
    assert.ok(calls.every((c) => c.headers.get('X-Upload-Key') === args.key));
    calls.length = 0;
    await uploadAttachment({ ...args, checkExisting: false });
    assert.deepEqual(calls.map((c) => c.method), ['post']);
  } finally { axios.defaults.adapter = adapter; }
});
