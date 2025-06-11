// Extend Vitest's expect method with methods from testing-library
import '@testing-library/jest-dom';

// Any other global setup can go here
// For example, mocking global objects or functions:
// global.ResizeObserver = require('resize-observer-polyfill'); // If ResizeObserver mock was problematic

// Mock HTMLMediaElement.prototype.play for JSDOM environment to prevent "Not implemented" errors
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  HTMLMediaElement.prototype.pause = vi.fn();
  // You can add other media element methods if needed by components (load, etc.)
}


// Clean up after each test (optional, but good practice)
// import { cleanup } from '@testing-library/react';
// afterEach(() => {
//   cleanup();
// });
