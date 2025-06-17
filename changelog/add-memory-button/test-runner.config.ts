import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'Manual Memory Entry Tests',
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    globals: true,
    include: [
      'changelog/add-memory-button/**/*.test.ts',
      'changelog/add-memory-button/**/*.test.tsx'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'client/src/components/MemorySection.tsx',
        'server/routes.ts'
      ],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.*',
        '**/*.config.*'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../client/src'),
      '@/components': path.resolve(__dirname, '../../client/src/components'),
      '@/lib': path.resolve(__dirname, '../../client/src/lib'),
      '@/hooks': path.resolve(__dirname, '../../client/src/hooks')
    }
  }
});