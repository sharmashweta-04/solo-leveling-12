import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/engine/**/*.test.ts', 'src/engine/**/__tests__/**/*.test.ts']
  }
});
