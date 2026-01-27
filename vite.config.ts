import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'logo.svg', 'ico.svg'],
      manifest: {
        name: 'Fanplanner',
        short_name: 'Fanplanner',
        description: 'Track your income and expenses',
        theme_color: '#42b883',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'ico.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'ico.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
          {
            src: 'favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        // Exclude vendor files from precaching to avoid "Not allowed nest placeholder" errors
        // Vendor files will be cached via runtime caching instead
        globIgnores: ['**/vue-vendor*.js', '**/fontawesome*.js', '**/index*.js'],
        // Don't modify files during caching
        dontCacheBustURLsMatching: /\.\w{8}\./,
        runtimeCaching: [
          // Cache vendor files with NetworkFirst to avoid parsing issues
          {
            urlPattern: /vue-vendor.*\.js$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'vue-vendor-cache',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /fontawesome.*\.js$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fontawesome-cache',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache Tesseract.js worker files - use NetworkFirst for PWA compatibility
          // This ensures worker files are always fresh and not blocked by stale cache
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*tesseract.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'tesseract-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days (shorter for freshness)
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 10, // Timeout after 10 seconds, then use cache
            },
          },
          // Cache Tesseract.js core WASM files - use NetworkFirst for PWA compatibility
          {
            urlPattern: /\.wasm$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'wasm-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 10,
            },
          },
          // Cache Tesseract.js language data files - use NetworkFirst for PWA compatibility
          {
            urlPattern: /\.traineddata$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'tesseract-lang-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 10,
            },
          },
          // Cache all CDN assets (for tesseract.js and other libraries) - use NetworkFirst
          // This ensures Tesseract.js resources are not blocked by stale cache in PWA
          {
            urlPattern: /^https:\/\/.*\.(js|wasm|traineddata)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days (shorter for freshness)
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 10, // Timeout after 10 seconds, then use cache
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5173,
    open: true,
    strictPort: false,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Use esbuild with safer options to avoid "Not allowed nest placeholder" errors
    minify: 'esbuild',
    target: 'esnext',
    // Disable chunk size warnings that might cause issues
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Exclude tesseract.js from manual chunks to avoid bundling issues
          if (id.includes('tesseract')) {
            return null
          }
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
              return 'vue-vendor'
            }
            if (id.includes('@fortawesome')) {
              return 'fontawesome'
            }
          }
          return null
        },
        // Use safer output format to avoid nested placeholder issues
        format: 'es',
        // Preserve original structure to avoid parsing errors
        compact: false,
      },
    },
  },
})
