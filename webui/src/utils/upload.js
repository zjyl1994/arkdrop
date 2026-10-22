import axios from 'axios';
import { cacheUploadedImage } from './imageCache.js';

// The same key survives retries, including a successful upload whose response was lost.
export const newUploadKey = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const uploadAttachment = async ({ parcelId, file, key, onProgress, checkExisting = true }) => {
  const config = { withCredentials: true, headers: { 'X-Upload-Key': key } };
  let data;
  if (checkExisting) {
    const response = await axios.get(`/api/attachment/upload-status?id=${parcelId}`, config);
    if (response.data.attachments?.length) data = response.data;
  }
  if (!data) {
    const form = new FormData();
    form.append('file', file);
    const response = await axios.post(`/api/attachment?id=${parcelId}`, form, {
      ...config,
      onUploadProgress: onProgress,
    });
    data = response.data;
  }
  // Storage quota or private-mode restrictions must not turn a successful upload into a failure.
  try { await cacheUploadedImage(data.attachments?.[0], file, data.expires_at); } catch { /* Best effort. */ }
  return data;
};
