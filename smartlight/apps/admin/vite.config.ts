import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@smartlight/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@smartlight/config': path.resolve(__dirname, '../../packages/config/src/index.ts'),
      '@smartlight/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
});
