import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Disable PWA in development to avoid caching issues
    mode !== 'development' && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'robots.txt', 'apple-touch-icon.png', 'images/logodetaxerdc.png'],
      manifest: {
        name: 'Tax Free RDC - Détaxe officielle',
        short_name: 'Tax Free RDC',
        description: 'Service de détaxe 100% digital pour les voyageurs en RDC. Récupérez jusqu\'à 16% de TVA sur vos achats.',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        categories: ['finance', 'shopping', 'travel'],
        lang: 'fr',
        icons: [
          {
            src: '/images/logodetaxerdc.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/images/logodetaxerdc.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
}));
