import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@cardstone/shared': path.resolve(__dirname, '../shared'),
      '@radax/ui': path.resolve(__dirname, 'src/lib/radax-ui.ts')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8787',
        ws: true
      }
    }
  }
});
