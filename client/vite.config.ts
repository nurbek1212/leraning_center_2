import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev rejimida /api so'rovlari server'ga (5000-port) yo'naltiriladi
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
