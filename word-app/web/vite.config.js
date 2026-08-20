import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // APIキーをフロントに露出させないため、AI呼び出しを含む全APIはバックエンド経由
    proxy: {
      '/api': {
        target: process.env.API_ORIGIN || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
