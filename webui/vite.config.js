import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';
import AutoImport from 'unplugin-auto-import/vite';

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
            'ClearAll'
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
        theme_color: '#3f51b5',
        background_color: '#ffffff',
        lang: 'zh-CN',
        start_url: '/',
        dir: 'ltr',
        display: 'standalone',
        icons: [
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
    }),
  ],
  define: {
    __BUILD_TIMESTAMP__: new Date().getTime(),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'vendor-react';
            } else {
              return 'vendor-others';
            }
          }
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
      }
    }
  }
})
