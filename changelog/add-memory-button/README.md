# Manual Memory Entry Feature - Testing & Documentation

This directory contains comprehensive documentation and tests for the Manual Memory Entry feature implemented on June 17, 2025.

## Feature Overview

The Manual Memory Entry feature allows users to directly add important information to their AI coach's memory system through a dedicated interface in the AI Memory section. This feature integrates seamlessly with the existing memory processing pipeline while providing explicit control over memory creation.

## Files in this Directory

### Documentation
- **`implementation-details.md`** - Comprehensive technical documentation including architecture, API contracts, and integration details
- **`README.md`** - This file, providing overview and testing instructions

### Test Files
- **`manual-memory.test.ts`** - Frontend component tests for the memory entry form and UI interactions
- **`api-tests.test.ts`** - Backend API endpoint tests for validation, error handling, and integration
- **`test-runner.config.ts`** - Vitest configuration for running the manual memory entry tests

## Running the Tests

### Prerequisites

Ensure you have the required testing dependencies installed:

```bash
npm install vitest @testing-library/react @testing-library/jest-dom jsdom supertest --save-dev
```

### Frontend Component Tests

The frontend tests cover:
- UI component rendering and interaction
- Form validation logic
- User input handling
- Error states and loading states
- Cache invalidation after successful submission

Run frontend tests:
```bash
npx vitest changelog/add-memory-button/manual-memory.test.ts
```

### Backend API Tests

The backend tests cover:
- Input validation for content, category, and importance
- API endpoint behavior under various conditions
- Error handling and response formats
- Integration with the memory service
- Background processing workflows

Run backend tests:
```bash
npx vitest changelog/add-memory-button/api-tests.test.ts
```

### All Tests

Run all manual memory entry tests:
```bash
npx vitest changelog/add-memory-button/
```

### With Coverage

Generate test coverage report:
```bash
npx vitest changelog/add-memory-button/ --coverage
```

## Test Categories

### 1. UI Component Tests (`manual-memory.test.ts`)

#### UI Components
- Renders "Add Memory" button in Memory Overview
- Opens modal dialog when button is clicked
- Displays all required form fields with proper labels
- Shows appropriate placeholder text and descriptions

#### Form Validation
- Validates minimum content length (10 characters)
- Validates maximum content length (500 characters)
- Validates category enum values
- Validates importance enum values
- Accepts valid input combinations

#### Form Submission
- Prevents submission with invalid data
- Calls API with correct data format
- Converts importance levels to numeric scores
- Shows loading state during processing
- Handles successful submission workflow

#### Error Handling
- Displays error toasts for API failures
- Shows fallback messages for network errors
- Maintains form state during error conditions

#### Cache Management
- Invalidates memory queries after successful creation
- Refetches data to update UI immediately
- Closes modal and resets form after success

### 2. Backend API Tests (`api-tests.test.ts`)

#### Input Validation
- Rejects requests with missing or invalid content
- Validates content length boundaries
- Enforces category enum restrictions
- Validates importance score ranges and types

#### Memory Service Integration
- Calls `createMemory` with correct parameters
- Triggers background processing via `processMessageForMemory`
- Continues processing even if background tasks fail
- Handles memory service errors gracefully

#### Response Formats
- Returns correct JSON structure for successful creation
- Provides appropriate error messages for failures
- Handles unexpected errors with generic fallbacks

#### Content Processing
- Trims whitespace from submitted content
- Handles edge cases at validation boundaries
- Processes all valid category and importance combinations

## Test Data Patterns

### Valid Test Data
```javascript
{
  content: "I prefer morning workouts and have a gluten sensitivity",
  category: "preference", // preference | personal_info | context | instruction
  importance: 0.6 // 0.0 - 1.0 range
}
```

### Invalid Test Cases
- Content too short: `"short"`
- Content too long: `"a".repeat(501)`
- Invalid category: `"invalid_category"`
- Invalid importance: `1.5` (out of range)
- Wrong importance type: `"high"` (string instead of number)

## Integration Testing

### Frontend-Backend Integration
The tests verify that:
- Frontend form data correctly maps to API request format
- API responses properly update the frontend state
- Error messages flow correctly from backend to UI
- Cache invalidation triggers appropriate UI updates

### Memory System Integration
The tests confirm that:
- Manual memories use the same processing pipeline as chat-derived memories
- Background relationship detection works for manual entries
- Memory categorization and importance scoring function correctly
- The feature maintains compatibility with existing memory queries

## Performance Testing

### Metrics Tested
- Form validation performance (< 1ms)
- API response times (~800ms including database operations)
- UI update responsiveness (immediate cache refresh)

### Load Testing Considerations
- Memory creation under concurrent user load
- Database performance with multiple simultaneous insertions
- Cache invalidation efficiency across multiple users

## Test Environment Setup

### Mocking Strategy
- **Frontend**: Mock API requests and toast notifications
- **Backend**: Mock memory service dependencies
- **Database**: Use in-memory test database for isolation

### Test Isolation
- Each test runs independently with fresh mocks
- Database state reset between test runs
- No cross-test dependencies or shared state

## Continuous Integration

### Test Automation
- Tests run automatically on code changes
- Coverage reports generated for each test run
- Failed tests block deployment pipeline

### Coverage Requirements
- **Minimum Coverage**: 80% for lines, functions, branches, statements
- **Focus Areas**: Form validation logic, API error handling, cache management
- **Exclusions**: Mock files, configuration files, test utilities

## Debugging Tests

### Common Issues
1. **Mock Import Errors**: Ensure mocks are properly configured before imports
2. **DOM Environment**: Tests require `jsdom` environment for React component testing
3. **Async Operations**: Use `waitFor` for asynchronous UI updates
4. **API Mocking**: Verify mock implementations match actual service behavior

### Debugging Commands
```bash
# Run tests in watch mode
npx vitest changelog/add-memory-button/ --watch

# Run with detailed output
npx vitest changelog/add-memory-button/ --reporter=verbose

# Debug specific test
npx vitest changelog/add-memory-button/manual-memory.test.ts --t "renders Add Memory button"
```

## Future Test Enhancements

### Planned Additions
1. **E2E Tests**: Full user journey from button click to memory display
2. **Performance Tests**: Memory creation under load conditions
3. **Accessibility Tests**: Screen reader and keyboard navigation support
4. **Cross-browser Tests**: Compatibility across different browsers
5. **Mobile Tests**: Touch interaction and responsive behavior

### Test Data Expansion
1. **Internationalization**: Test with non-English content
2. **Edge Cases**: Special characters, emoji, markdown content
3. **Bulk Operations**: Multiple memory creation scenarios
4. **Conflict Resolution**: Duplicate memory handling

## Maintenance Guidelines

### Regular Updates
- Update tests when API contracts change
- Refresh mock data to match production patterns
- Review coverage requirements quarterly
- Update documentation with new test scenarios

### Test Quality Standards
- Each test should focus on a single behavior
- Test names should clearly describe the expected behavior
- Arrange-Act-Assert pattern for test structure
- Meaningful assertions with descriptive error messages