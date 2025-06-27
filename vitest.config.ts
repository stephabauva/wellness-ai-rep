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
    server: {
      deps: {
        inline: [
          // Ensure JSX in this specific test file (outside Vite root) is processed
          // by Vite's React plugin via Vitest.
          /changelog\/add-memory-button\/manual-memory\.test\.ts$/,
          // Include server-side testing dependencies
          'supertest',
          'express'
        ]
      }
    }
    // Add any other Vitest specific configurations here
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
