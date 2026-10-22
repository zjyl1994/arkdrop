import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import '@fontsource/lato/300.css';
import '@fontsource/lato/400.css';
import '@fontsource/lato/700.css';
import { pruneListCaches } from './utils/clientCache';
import { pruneImages } from './utils/imageCache';
import { syncErudaState } from './utils/eruda';

// 使用本地 CAP WASM，不从 CDN 加载
if (typeof window !== 'undefined') {
  // 使用绝对地址，避免 Worker 中的模块解析错误
  const wasmUrl = new URL('/cap/cap_wasm.js', window.location.origin).toString();
  window.CAP_CUSTOM_WASM_URL = wasmUrl;

  syncErudaState();
  // Remove legacy caches once; retain the bounded image cache across launches.
  if ('caches' in window) {
    void Promise.all(['arkdrop-api-list', 'arkdrop-file-images'].map((key) => caches.delete(key))).catch(() => {});
  }
  void pruneImages().catch(() => {});
  pruneListCaches();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
