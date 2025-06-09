/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react'; // For React support

import path from 'path'; // Import path module for alias resolution

export default defineConfig({
  plugins: [react()], // Essential for React component testing
  test: {
    globals: true, // To use expect, describe, it, etc., without importing
    environment: 'jsdom', // Explicitly set the environment
    setupFiles: './client/src/setupTests.ts',
    css: false,
    // Add any other Vitest specific configurations here
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
});
