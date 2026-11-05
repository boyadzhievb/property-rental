import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  base: process.env.GITHUB_PAGES_BASE || './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new version waits until the owner taps Refresh in the update banner (src/pwa.ts).
      registerType: 'prompt',
      // Registered by src/pwa.ts, on the web only: native apps ship their files in the bundle.
      injectRegister: false,
      // The workbox globPatterns below already precache the icons and the manifest.
      includeManifestIcons: false,
      manifest: {
        name: 'Property Rental',
        short_name: 'Rental',
        description: 'Your property. Your reservations. Simple. Private. Offline.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#007AFF',
        icons: [
          { src: 'icons/icon-48.png', sizes: '48x48', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-256.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'New Reservation', url: './?action=new-reservation', icons: [{ src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' }] },
          { name: 'Today', url: './', icons: [{ src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' }] },
        ],
      },
      workbox: {
        // Precache the whole app shell with content hashes, so an update replaces exactly what
        // changed and old files are removed. Store screenshots are not part of the app.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        globIgnores: ['screenshots/**'],
        navigateFallback: 'index.html',
        // Standalone pages served next to the app must load as themselves.
        navigateFallbackDenylist: [/landing\.html$/, /privacy-policy\.html$/, /support\.html$/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor';
          }
          if (id.includes('node_modules/date-fns')) {
            return 'date-fns';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          if (id.includes('node_modules/zod')) {
            return 'zod';
          }
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
  },
})
