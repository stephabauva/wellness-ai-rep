
# Phase 1 Implementation Issues and Fixes

## Issues Identified

### 1. AI Access Integration Not Complete
**Issue**: AI consent settings exist but aren't enforced in AI service calls
**Status**: Needs Phase 2 implementation
**Impact**: AI has unrestricted access to all health data despite consent settings

### 2. Missing Data Retention Service
**Issue**: Retention policies are stored but no automatic deletion occurs
**Status**: Critical missing component
**Impact**: Data accumulates indefinitely regardless of user preferences

### 3. Dashboard Visibility Update Error
**Issue**: HTTP token error when updating dashboard visibility
**Error**: `[plugin:runtime-error-plugin] Method is not a valid HTTP token.`
**Status**: Bug in consent settings endpoint
**Impact**: Users cannot modify dashboard visibility settings

### 4. Export Controls Not Implemented
**Issue**: Auto-export and AI interactions inclusion features are UI-only
**Status**: Backend services missing
**Impact**: Export preferences have no functional effect

## Required Fixes

### Fix 1: Dashboard Visibility Feature Relocation
**New Approach**: Move dashboard visibility control from Settings to Health Dashboard
**Implementation**: Add metrics selection card directly in health dashboard with:
- Interactive card with all smartphone health metrics
- '+' button to add metrics to dashboard
- Search functionality for metric discovery
- Real-time dashboard updates

**Technical Debt Resolved**: Eliminates HTTP token validation error by removing complex settings endpoint
**User Experience**: Direct interaction in context rather than buried in settings

### Fix 2: Data Retention Background Service
```typescript
// Implement scheduled service to clean up expired health data
// Should run daily and respect user retention policies per category
```

### Fix 3: Export Service Implementation
```typescript
// Implement actual data export functionality
// Support JSON/CSV/PDF formats with AI interactions optional inclusion
```

### Fix 4: AI Service Consent Integration
```typescript
// Phase 2: Integrate consent checks into AI service calls
// Filter health data based on user AI access consent settings
```

## Priority Order
1. **High**: Fix dashboard visibility update bug (blocking user interaction)
2. **High**: Implement data retention service (GDPR compliance)
3. **Medium**: Export service implementation (feature completeness)
4. **Medium**: AI service integration (Phase 2 scope)

## Technical Debt
- Console warnings about chart dimensions need addressing
- HTTP token validation needs review in routes.ts
- Consent service error handling could be more robust

## Next Steps
1. Debug and fix consent settings update endpoint
2. Implement background data retention service
3. Complete export functionality
4. Plan Phase 2 AI integration
