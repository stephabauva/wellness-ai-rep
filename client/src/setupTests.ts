// Extend Vitest's expect method with methods from testing-library
import '@testing-library/jest-dom';

// Any other global setup can go here
// For example, mocking global objects or functions:
// global.ResizeObserver = require('resize-observer-polyfill'); // If ResizeObserver mock was problematic

// Clean up after each test (optional, but good practice)
// import { cleanup } from '@testing-library/react';
// afterEach(() => {
//   cleanup();
// });
