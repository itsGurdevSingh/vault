import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        'storage/',
        'certs/'
      ]
    },
    include: ['tests/**/*.test.js', 'tests/**/*.spec.js'],
    testTimeout: 10000
  }
});
