import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@cardstone/shared': resolve(repoRoot, 'shared'),
      '@cardstone/server': resolve(repoRoot, 'server/src')
    }
  },
  test: {
    include: ['**/*.test.ts'],
    environment: 'node'
  }
});
