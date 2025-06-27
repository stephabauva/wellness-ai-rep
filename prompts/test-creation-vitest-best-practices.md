
# Test Creation with Vitest - Best Practices Prompt

## Mission Statement
You are a TypeScript testing expert tasked with creating comprehensive, type-safe tests using Vitest. Your tests must follow industry best practices, have zero TypeScript errors, and integrate seamlessly with the existing codebase.

## Core Requirements

### Type Safety & Build Validation
- **MANDATORY**: Run `npm run check` after test creation to validate TypeScript compliance
- All tests must pass TypeScript compilation without errors
- Use proper type annotations for test data, mocks, and assertions
- Import types explicitly where needed (`import type { ... }`)

### Vitest Configuration Adherence
- Follow existing `vitest.config.ts` and `test-runner.config.ts` patterns
- Use `jsdom` environment for React component testing
- Leverage existing setupFiles (`./client/src/setupTests.ts`)
- Utilize path aliases (`@/`, `@/components`, `@/lib`, `@/hooks`)

### Test Structure Standards
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should describe the expected behavior clearly', async () => {
    // Arrange - Set up test data and conditions
    // Act - Perform the action being tested
    // Assert - Verify the expected outcome
  });
});
```

## Mock Strategy Guidelines

### Prefer Real Data Over Mocks
1. **Use actual data structures** from your types (`fileManager.ts`, etc.)
2. **Create realistic test fixtures** that match production patterns
3. **Only mock external dependencies** (APIs, services, third-party libraries)

### When Mocking is Necessary
- External API calls (use `vi.fn()` for fetch, axios, etc.)
- File system operations
- Browser APIs (localStorage, sessionStorage, etc.)
- Time-dependent functions (Date.now, setTimeout)

### Mock Implementation Patterns
```typescript
// Service mocking
vi.mock('@/services/api-service', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' }),
  uploadFile: vi.fn().mockResolvedValue({ success: true })
}));

// Hook mocking
vi.mock('@/hooks/useFileManagement', () => ({
  useFileManagement: vi.fn(() => ({
    files: mockFiles,
    uploadFile: vi.fn(),
    deleteFile: vi.fn()
  }))
}));
```

## Test Categories & Scope

### Unit Tests
- Individual functions and utilities
- Custom hooks in isolation
- Service layer methods
- Type guards and validators

### Integration Tests
- Component + hook interactions
- API service integrations
- Context provider functionality
- Route handler testing

### Component Tests
- React component rendering
- User interaction workflows
- Props handling and validation
- State management verification

## Real Data Creation Guidelines

### File Manager Test Data
```typescript
import type { AttachedFile } from '@/hooks/useFileManagement';

const createMockFile = (overrides?: Partial<AttachedFile>): AttachedFile => ({
  id: '1',
  fileName: 'test-document.pdf',
  displayName: 'Test Document',
  fileType: 'application/pdf',
  fileSize: 1024000,
  url: 'blob:test-url',
  category: 'documents',
  ...overrides
});
```

### Health Data Test Fixtures
```typescript
const mockHealthMetrics = {
  heartRate: [
    { timestamp: '2024-01-01T08:00:00Z', value: 72, unit: 'bpm' },
    { timestamp: '2024-01-01T12:00:00Z', value: 85, unit: 'bpm' }
  ],
  steps: [
    { date: '2024-01-01', value: 8500, unit: 'steps' }
  ]
};
```

## Testing Patterns by Component Type

### Form Components
- Test form validation
- Submit handler execution
- Error state display
- Loading states

### Data Display Components
- Data rendering accuracy
- Empty state handling
- Loading state presentation
- Error boundary behavior

### Interactive Components
- Click handlers
- Keyboard navigation
- Accessibility compliance
- State updates

## Performance Testing Integration
```typescript
import { performance } from 'perf_hooks';

it('should render large datasets efficiently', () => {
  const startTime = performance.now();
  render(<DataTable data={largeMockDataset} />);
  const endTime = performance.now();
  
  expect(endTime - startTime).toBeLessThan(100); // ms
});
```

## Error Handling & Edge Cases

### Required Test Scenarios
- Empty data states
- Network error conditions
- Invalid input handling
- Boundary value testing
- Async operation failures

### Error Boundary Testing
```typescript
it('should handle component errors gracefully', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };
  
  expect(() => render(<ErrorBoundary><ThrowError /></ErrorBoundary>))
    .not.toThrow();
});
```

## Coverage Requirements

### Minimum Coverage Targets
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Focus Areas for High Coverage
- Form validation logic
- API error handling
- Cache management
- User interaction flows

## Test Organization Best Practices

### File Naming Convention
- `ComponentName.test.tsx` for component tests
- `hookName.test.ts` for hook tests
- `serviceName.test.ts` for service tests
- `utils.test.ts` for utility function tests

### Test Suite Structure
```
client/src/tests/
├── components/
│   ├── chat/
│   ├── health/
│   ├── filemanager/
│   └── settings/
├── hooks/
├── services/
└── utils/
```

## Async Testing Patterns

### API Testing
```typescript
it('should handle async data loading', async () => {
  const mockData = { id: 1, name: 'Test' };
  vi.mocked(fetchData).mockResolvedValue(mockData);
  
  render(<AsyncComponent />);
  
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### User Interaction Testing
```typescript
it('should handle user interactions correctly', async () => {
  render(<InteractiveComponent />);
  
  const button = screen.getByRole('button', { name: /submit/i });
  fireEvent.click(button);
  
  await waitFor(() => {
    expect(mockSubmitHandler).toHaveBeenCalledTimes(1);
  });
});
```

## Debugging & Troubleshooting

### Common Issues Prevention
1. **Import path resolution**: Use configured aliases
2. **Mock timing**: Ensure mocks are set before imports
3. **Async operations**: Always use `waitFor` for async updates
4. **Type mismatches**: Import and use proper types

### Debugging Commands
```bash
# Run specific test file with verbose output
npx vitest run path/to/test.test.ts --reporter=verbose

# Run tests in watch mode
npx vitest path/to/test.test.ts --watch

# Run with coverage
npx vitest run --coverage

# Type check before running tests
npm run check && npx vitest run
```

## Quality Checklist

Before submitting tests, verify:
- [ ] `npm run check` passes without TypeScript errors
- [ ] All tests pass consistently
- [ ] Mock usage is minimal and justified
- [ ] Real data is used where possible
- [ ] Test names clearly describe expected behavior
- [ ] Async operations are properly handled
- [ ] Error cases are covered
- [ ] Performance considerations are addressed

## Integration with Existing Codebase

### Respect Existing Patterns
- Follow established component patterns
- Use existing utility functions
- Leverage current service layer
- Maintain consistency with existing tests

### Build Integration
- Tests must work with existing Vite configuration
- No modifications to build tools
- Preserve HMR and WebSocket functionality
- Maintain Replit environment compatibility

## Success Criteria

### Technical Validation
- **Zero TypeScript errors**: All tests compile cleanly
- **100% test pass rate**: No flaky or failing tests
- **Performance compliance**: Tests run efficiently
- **Coverage targets met**: Achieve minimum coverage thresholds

### Code Quality Standards
- Clear, descriptive test names
- Proper test isolation and cleanup
- Meaningful assertions with descriptive messages
- Comprehensive edge case coverage

Remember: Type safety is paramount. Every test must pass `npm run check` validation before completion.
