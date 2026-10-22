import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';
import AutoImport from 'unplugin-auto-import/vite';

const pwaThemeColor = '#3f51b5';

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
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
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
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],

      },
    }),
  ],
  define: {
    __BUILD_TIMESTAMP__: new Date().getTime(),
    'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(new Date().toLocaleString('zh-CN', { hour12: false })),
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
