import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],

    env: { DB_PATH: ':memory:' },
    setupFiles: ['tests/setup.js'],

    fileParallelism: false,

    coverage: {
      include: ['*.js', 'database/**/*.js'],
      exclude: [
        'vitest.config.js',
        'test-services.js'
      ]
    }
  }
});
