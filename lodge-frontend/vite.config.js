import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/login": "http://localhost:5000",
      "/api": "http://localhost:5000",
    },
  },
  preview: {
    port: 4173,
  },
});
