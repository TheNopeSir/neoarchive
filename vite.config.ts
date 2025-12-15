import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'NeoArchive: Y2K Collection Manager',
        short_name: 'NeoArchive',
        description: 'Retro-futuristic artifact preservation system',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'https://ui-avatars.com/api/?name=NA&background=4ade80&color=000&size=192&font-size=0.5',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://ui-avatars.com/api/?name=NA&background=4ade80&color=000&size=512&font-size=0.5',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB

        runtimeCaching: [
          // Внешние изображения - долгое кэширование
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 дней
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },

          // API запросы - Network First с коротким кэшем
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 минут
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },

          // Supabase Storage - долгое кэширование
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 дней
              }
            }
          },

          // UI Avatars - долгое кэширование
          {
            urlPattern: /^https:\/\/ui-avatars\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'avatar-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 дней
              }
            }
          },

          // Picsum Photos (если используются)
          {
            urlPattern: /^https:\/\/picsum\.photos\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'placeholder-images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 дней
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 3000,
    strictPort: false, // Try next port if 3000 is taken (avoids collision with server.js)
    cors: true, // Allow CORS
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000', // Assuming server.js runs on 3000 locally
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('🔴 Proxy Error (Server likely down):', err);
          });
        },
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext' // Modern browsers support
  }
})