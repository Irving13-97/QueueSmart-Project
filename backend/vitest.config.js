import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    coverage: {
      include: ['*.js'],
      exclude: ['vitest.config.js', 'test-services.js']
    }
  }
});
