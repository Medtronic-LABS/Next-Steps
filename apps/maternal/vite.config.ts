import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Medtronic LABS brand indigo — matches --ml-blue in the design tokens.
const BRAND = '#1E14BE';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      // Precache the app shell + design-system assets so the app opens with no network.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The service worker itself must never be cached (see firebase.json headers).
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Runtime-cache fonts / static assets served from the same origin.
            urlPattern: ({ request }) =>
              request.destination === 'font' || request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'ns-assets',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'Next Steps for Maternal Care',
        short_name: 'Next Steps',
        description:
          'Close the loop on every high-risk pregnancy, from sub-centre to tertiary. Coordination data only.',
        theme_color: BRAND,
        background_color: '#FCFBF9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
