
# Feature Analysis Tool

## Size Constraints & Optimization Guidelines

### Token and Complexity Limits
- **Maximum 1000 tokens per system map file**
- **Maximum 15 nested hierarchy levels**
- **Maximum 20 components per feature map**
- **Maximum 10 API endpoints per feature map**

### When to Split Features
- **Token limit exceeded**: Over 1000 tokens
- **Hierarchy too deep**: More than 15 nested levels  
- **Component overload**: More than 20 components
- **API endpoint overload**: More than 10 endpoints

### Splitting Strategies
- **By user flow**: Split complex workflows into sub-features
- **By architectural layer**: Separate frontend/backend into distinct maps
- **By business domain**: Group related functionality together
- **Parent-child refs**: Use `$ref:` links between split features

### SHDL Format Benefits
- **Token efficiency**: 20% reduction in file size
- **Semantic density**: 15% increase in meaning per token
- **Processing speed**: 25% faster AI parsing
- **Cost reduction**: Significant savings for large codebases
- **Use conversion guide**: (.system-maps/md-json-txt-to-shdl-conversion-guide.shdl) for optimization

## Quick Feature Mapping Checklist

Use this checklist to ensure complete coverage when mapping any feature:

### 📋 Pre-Analysis Checklist

- [ ] **Feature Entry Point Identified**: Primary UI component or API endpoint
- [ ] **User Journey Mapped**: Complete user workflow documented
- [ ] **Scope Boundaries Set**: Clear definition of what's included/excluded

### 🔍 Discovery Phase

#### Frontend Discovery
- [ ] **Primary Components**: Main React components implementing the feature
- [ ] **Supporting Components**: Helper components, modals, forms
- [ ] **Shared UI Components**: Components from `/client/src/components/ui/`
- [ ] **Custom Hooks**: Hooks in `/client/src/hooks/` used by the feature
- [ ] **Services**: Frontend services in `/client/src/services/`
- [ ] **Types**: TypeScript interfaces in `/client/src/types/`
- [ ] **Utilities**: Helper functions in `/client/src/utils/`

#### Backend Discovery
- [ ] **Route Handlers**: Express routes in `/server/routes/`
- [ ] **Services**: Business logic in `/server/services/`
- [ ] **Middleware**: Authentication, validation middleware
- [ ] **Database Schema**: Tables, relationships, indexes
- [ ] **Shared Types**: Types in `/shared/schema.ts`

#### Integration Discovery
- [ ] **External APIs**: Third-party service integrations
- [ ] **Go Services**: AI Gateway, File Accelerator, Memory Service
- [ ] **Browser APIs**: FileReader, Camera, Geolocation, etc.
- [ ] **Database Queries**: SQL operations and transactions

### 🌊 Data Flow Analysis

#### Request Flow
- [ ] **User Action**: Specific trigger (click, form submit, etc.)
- [ ] **Event Handler**: Function that handles the user action
- [ ] **State Updates**: React state changes triggered
- [ ] **API Call**: HTTP request details (endpoint, method, payload)
- [ ] **Route Processing**: Backend route and middleware chain
- [ ] **Service Execution**: Business logic services called
- [ ] **Database Operations**: Queries, transactions, table access
- [ ] **External Service Calls**: Third-party API interactions

#### Response Flow
- [ ] **Data Processing**: How response data is transformed
- [ ] **Response Payload**: Data structure returned to frontend
- [ ] **Cache Updates**: Cache invalidation and updates
- [ ] **UI Updates**: Component re-renders and state changes
- [ ] **User Feedback**: Loading states, success/error messages

### 🚨 Error Boundary Analysis

- [ ] **Input Validation**: Frontend and backend validation
- [ ] **Network Error Handling**: API call failure scenarios
- [ ] **Business Logic Errors**: Service layer error handling
- [ ] **Database Error Handling**: Query failure scenarios
- [ ] **External Service Failures**: Third-party API error handling
- [ ] **User Error Communication**: Error message display
- [ ] **Recovery Mechanisms**: Retry logic, fallback behaviors

### ⚡ Performance Analysis

- [ ] **Bundle Impact**: Component size and lazy loading
- [ ] **Render Optimization**: React.memo, useMemo, useCallback usage
- [ ] **Cache Strategy**: React Query configuration
- [ ] **Database Performance**: Query optimization, indexing
- [ ] **Payload Size**: Request/response data optimization
- [ ] **Loading States**: Progressive loading implementation

### 🔐 Security Analysis

- [ ] **Authentication**: User verification requirements
- [ ] **Authorization**: Permission and role checks
- [ ] **Input Sanitization**: Data cleaning and validation
- [ ] **Sensitive Data**: PII, health data handling
- [ ] **API Security**: Rate limiting, CORS, headers

### 🧪 Testing & Evidence

- [ ] **Unit Tests**: Component and service tests
- [ ] **Integration Tests**: End-to-end workflow tests
- [ ] **Manual Testing**: User workflow verification
- [ ] **Performance Tests**: Load and stress testing
- [ ] **Security Tests**: Vulnerability assessments

### 📊 Dependencies & Impact

- [ ] **Internal Dependencies**: Other features this relies on
- [ ] **External Dependencies**: Third-party services
- [ ] **Shared Components**: Components used by multiple features
- [ ] **Shared Services**: Services used across domains
- [ ] **Impact Analysis**: Features affected by changes to this feature

## Analysis Commands

Use these commands to discover feature components:

```bash
# Find all components that might be related to a feature
grep -r "FeatureName" client/src/components/

# Find API routes related to feature
grep -r "feature-endpoint" server/routes/

# Find database tables accessed
grep -r "tableName" server/services/

# Find shared types used
grep -r "FeatureType" shared/

# Find external API calls
grep -r "external-api-url" server/services/

# Find React Query keys
grep -r "queryKey.*feature" client/src/hooks/
```

## Quick Start Template

For rapid feature mapping, start with this minimal template and expand:

```json
{
  "_metadata": {
    "featureName": "your-feature-name",
    "domain": "primary-domain",
    "analysisDate": "2025-01-XX"
  },
  "userFlow": ["User action 1", "System response 1", "User sees result"],
  "systemFlow": ["Receive request", "Process data", "Return response"],
  "primaryComponents": {
    "frontend": ["MainComponent", "SupportingComponent"],
    "backend": ["route-handler.ts", "service.ts"],
    "database": ["primary_table", "related_table"]
  },
  "dataFlow": {
    "requestPath": "Component → Hook → API → Route → Service → Database",
    "responsePath": "Database → Service → Route → API → Hook → Component",
    "cacheInvalidation": ["query:feature-data"]
  },
  "integrationStatus": {
    "status": "active|partial|planned|broken",
    "lastVerified": "2025-01-XX",
    "evidence": "test-file-path or manual-verification"
  }
}
```

This tool ensures systematic analysis and complete coverage of every architectural element touching your feature.
