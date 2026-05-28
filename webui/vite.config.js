import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';
import AutoImport from 'unplugin-auto-import/vite';

const pwaThemeColor = '#3f51b5';

function getVendorChunkName(id) {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  if (id.includes('eruda')) {
    return 'vendor-eruda';
  }

  if (
    id.includes('react-router-dom')
    || id.includes('react-router')
  ) {
    return 'vendor-router';
  }

  if (
    id.includes('/react/')
    || id.includes('/react-dom/')
    || id.includes('/scheduler/')
  ) {
    return 'vendor-react';
  }

  if (id.includes('@mui/icons-material')) {
    return 'vendor-mui-icons';
  }

  if (
    id.includes('@mui/material')
    || id.includes('@mui/system')
    || id.includes('@mui/utils')
    || id.includes('@mui/private-theming')
    || id.includes('@mui/styled-engine')
    || id.includes('@mui/core-downloads-tracker')
  ) {
    return 'vendor-mui';
  }

  if (id.includes('@emotion')) {
    return 'vendor-emotion';
  }

  if (id.includes('@cap.js')) {
    return 'vendor-cap';
  }

  if (id.includes('axios')) {
    return 'vendor-axios';
  }

  if (id.includes('dayjs')) {
    return 'vendor-dayjs';
  }

  return 'vendor-others';
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    AutoImport({
      imports: [
        'react',
        {
          'react': [
            'React',
            'useState',
            'useEffect',
            'useRef',
            'useCallback',
            'useMemo',
            'Fragment'
          ]
        },
        {
          '@mui/material': [
            'AppBar',
            'Toolbar',
            'Box',
            'Button',
            'Typography',
            'Container',
            'Paper',
            'TextField',
            'Alert',
            'Modal',
            'Dialog',
            'DialogTitle',
            'DialogContent',
            'DialogContentText',
            'DialogActions',
            'Snackbar',
            'IconButton',
            'List',
            'ListItem',
            'ListItemIcon',
            'ListItemText',
            'ListItemAvatar',
            'Avatar',
            'Divider',
            'Chip',
            'Tooltip',
            'CircularProgress',
            'LinearProgress',
            'TextareaAutosize',
            'ImageList',
            'ImageListItem',
            'ImageListItemBar',
            'SpeedDial',
            'SpeedDialIcon',
            'SpeedDialAction',
            'CssBaseline',
            'ThemeProvider',
            'createTheme',
            'useMediaQuery'
          ],
          '@mui/icons-material': [
            'Download',
            'Add',
            'Delete',
            'Inbox',
            'Star',
            'StarBorder',
            'Attachment',
            'Image',
            'TextSnippet',
            'Close',
            'CloudUpload',
            'Send',
            'Cancel',
            'ClearAll',
            'ZoomIn',
            'ContentCopy',
          ],
          '@mui/material/styles': [
             'styled'
           ],
           '@mui/material/colors': [
             'blue',
             'indigo'
           ]
        }
      ],
      dts: true, // 生成类型定义文件
      eslintrc: {
        enabled: true, // 生成ESLint配置
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'images/apple-touch-icon.png',
        'images/favicon-16x16.png',
        'images/favicon-32x32.png',
        'images/android-chrome-192x192.png',
        'images/android-chrome-512x512.png',
      ],
      manifest: {
        name: 'ArkDrop 文件传输助手',
        short_name: 'ArkDrop',
        description: 'ArkDrop 是一个轻量化的文件传输助手实现',
        id: '/',
        scope: '/',
        theme_color: pwaThemeColor,
        background_color: pwaThemeColor,
        lang: 'zh-CN',
        start_url: '/',
        dir: 'ltr',
        display: 'standalone',
        display_override: ['standalone', 'browser'],
        icons: [
          {
            src: 'images/favicon-16x16.png',
            sizes: '16x16',
            type: 'image/png'
          },
          {
            src: 'images/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png'
          },
          {
            src: 'images/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          },
          {
            src: 'images/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'images/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin, url }) => (
              sameOrigin
              && request.method === 'GET'
              && url.pathname.startsWith('/api/list')
            ),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'arkdrop-api-list',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ request, sameOrigin, url }) => (
              sameOrigin
              && request.destination === 'image'
              && url.pathname.startsWith('/files/')
            ),
            handler: 'CacheFirst',
            options: {
              cacheName: 'arkdrop-file-images',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  define: {
    __BUILD_TIMESTAMP__: new Date().getTime(),
    'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(new Date().toLocaleString('zh-CN', { hour12: false })),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          return getVendorChunkName(id);
        }
      }
    }
  },
  server: {
    proxy: {
      "/api": {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        ws: true,
      },
      "/files": {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      "/share": {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      }
    }
  }
})
