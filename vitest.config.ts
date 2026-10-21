import viteTsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [viteTsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/engine/**/*.test.ts', 'src/engine/**/__tests__/**/*.test.ts'],
  },
});
