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
  // Define global process.env variables for tests
  // These will be available before any modules are loaded.
  define: {
    'process.env.DATABASE_URL': JSON.stringify('mock_db_url_global_vitest_config'),
    'process.env.OPENAI_API_KEY': JSON.stringify('test_openai_key_global_vitest_config'),
    'process.env.GOOGLE_AI_API_KEY': JSON.stringify('test_google_key_global_vitest_config'),
    // Add any other critical env vars needed by services during their initialization
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@assets': path.resolve(__dirname, './attached_assets'),
    },
  },
});
