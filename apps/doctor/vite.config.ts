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
      manifest: {
        name: 'Next Steps — Doctor',
        short_name: 'NS Doctor',
        description:
          'Operational visibility on post-consultation follow-through: done, outstanding, and patients at risk.',
        theme_color: '#6165DE',
        background_color: '#f4f6f8',
        display: 'standalone',
        // Doctor is hosted under '/doctor/' (see firebase.json). Its scope is
        // set at build time via `vite build --base=/doctor/`.
        start_url: './',
        scope: './',
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
  server: { port: 5174 },
});
