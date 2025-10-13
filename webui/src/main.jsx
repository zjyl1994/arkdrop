import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import '@fontsource/lato/300.css';
import '@fontsource/lato/400.css';
import '@fontsource/lato/700.css';

// 使用本地 CAP WASM，不从 CDN 加载
if (typeof window !== 'undefined') {
  window.CAP_CUSTOM_WASM_URL = '/cap/cap_wasm.js';
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
