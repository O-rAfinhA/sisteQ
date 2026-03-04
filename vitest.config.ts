import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'react-router': path.resolve(__dirname, 'src/router.tsx'),
    },
  },
  test: {
    environment: 'jsdom',
    environmentMatchGlobs: [['src/server/**/*.test.ts', 'node']],
    setupFiles: ['./vitest.setup.ts'],
  },
});
