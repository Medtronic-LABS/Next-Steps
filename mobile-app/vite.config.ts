import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    // Local backend for /api/pwa (same path nginx proxies in deployment)
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true }
    }
  }
});

