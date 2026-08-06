import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      // Admin is served at '/'; don't let its service worker capture the
      // Doctor and Maternal apps that share the origin under '/doctor/' and '/maternal/'.
      workbox: { navigateFallbackDenylist: [/^\/doctor\//, /^\/maternal\//] },
      manifest: {
        name: 'Next Steps — Admin',
        short_name: 'NS Admin',
        description:
          'Record the doctor’s post-consultation next actions and work the prioritized daily list.',
        theme_color: '#1E14BE',
        background_color: '#f4f6f8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  resolve: {
    // Order matters: the styles subpath must be matched before the package root.
    alias: [
      {
        find: '@next-steps/core/styles.css',
        replacement: fileURLToPath(
          new URL('../../packages/core/src/styles/design.css', import.meta.url),
        ),
      },
      {
        find: '@next-steps/core',
        replacement: fileURLToPath(
          new URL('../../packages/core/src/index.ts', import.meta.url),
        ),
      },
    ],
  },
  server: { port: 5173 },
});
