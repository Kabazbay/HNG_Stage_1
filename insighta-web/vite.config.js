import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the backend during development
      '/auth': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
    },
  },
});
