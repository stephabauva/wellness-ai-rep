
# Complete Feature Mapping Blueprint

## Size Constraints & Optimization
- **Maximum 1000 tokens per system map file**
- **Maximum 15 nested hierarchy levels**
- **Feature splitting required** when limits exceeded
- **Preferred format: SHDL** for 20% token reduction and better semantic density
- **Use conversion guide** (.system-maps/md-json-txt-to-shdl-conversion-guide.shdl) for optimization

## Core Philosophy: Tree-Based Architecture Mapping

Each feature is a **tree** where:
- **Root**: The feature/functionality itself
- **Trunk**: Core user workflow and primary components
- **Branches**: All architectural layers (frontend, backend, database, services)
- **Leaves**: Every element that touches the feature (files, APIs, database tables, external services, browser APIs, etc.)

## 1. Data Flow Tracing Blueprint

### 1.1 Complete Request/Response Cycle
```json
{
  "dataFlowTrace": {
    "userAction": "String: Specific user interaction that triggers the feature",
    "frontendFlow": {
      "triggerComponent": "Component that initiates the action",
      "eventHandlers": ["Functions that handle the user action"],
      "stateChanges": ["React state updates triggered"],
      "reactQueryHooks": ["Query keys and mutations involved"],
      "apiCalls": {
        "endpoint": "Actual API endpoint called",
        "method": "HTTP method",
        "requestPath": ["UI Component → Hook → API Call → Network"],
        "requestPayload": "Data structure sent",
        "headers": ["Authentication", "Content-Type", "etc."]
      }
    },
    "networkLayer": {
      "requestRoute": "Frontend → Server route path",
      "middlewares": ["Authentication", "Validation", "etc."],
      "routeHandler": "Actual route function that receives the request"
    },
    "backendFlow": {
      "routeHandler": "File and function that processes request",
      "servicesCalled": ["Business logic services invoked"],
      "externalApiCalls": ["Third-party services called"],
      "databaseOperations": {
        "queries": ["SQL queries executed"],
        "tables": ["Database tables accessed"],
        "operations": ["CREATE", "READ", "UPDATE", "DELETE"],
        "transactions": ["Multi-table operations"]
      },
      "cacheOperations": ["Cache reads/writes/invalidations"],
      "fileSystemOperations": ["File uploads/downloads/processing"]
    },
    "responseFlow": {
      "dataTransformation": ["How data is shaped for response"],
      "responsePayload": "Data structure returned",
      "statusCodes": ["Success and error codes"],
      "responsePath": ["Database → Service → Route → Network → Frontend"]
    },
    "frontendUpdateFlow": {
      "reactQueryInvalidation": ["Query keys invalidated"],
      "stateUpdates": ["Component state changes"],
      "uiRefresh": ["Components that re-render"],
      "cacheConsistency": ["Frontend cache updates"],
      "userFeedback": ["Loading states", "Success messages", "Error handling"]
    }
  }
}
```

### 1.2 Complete File Dependency Mapping
```json
{
  "architecturalLayers": {
    "presentation": {
      "components": {
        "primary": ["Main components implementing the feature"],
        "supporting": ["Helper components, UI elements"],
        "shared": ["Reusable components from ui/ folder"]
      },
      "hooks": ["Custom hooks used"],
      "utilities": ["Frontend utilities and helpers"],
      "types": ["TypeScript interfaces and types"],
      "styles": ["CSS/Tailwind classes and style files"]
    },
    "businessLogic": {
      "routes": ["Express route handlers"],
      "services": ["Business logic services"],
      "middleware": ["Authentication, validation, etc."],
      "utilities": ["Backend utilities and helpers"],
      "types": ["Shared TypeScript types"]
    },
    "dataLayer": {
      "database": {
        "tables": ["Primary tables accessed"],
        "relationships": ["Foreign key relationships"],
        "indexes": ["Database indexes used"],
        "migrations": ["Schema changes required"]
      },
      "cache": {
        "cacheKeys": ["Redis/memory cache keys"],
        "invalidationPatterns": ["When cache is cleared"],
        "cacheStrategy": ["TTL, invalidation policies"]
      },
      "fileSystem": {
        "uploadPaths": ["File upload directories"],
        "fileTypes": ["Supported file formats"],
        "processing": ["File processing pipelines"]
      }
    },
    "integration": {
      "externalApis": {
        "services": ["Third-party services called"],
        "authentication": ["API keys, OAuth, etc."],
        "endpoints": ["Specific external endpoints"],
        "fallbacks": ["Error handling for external failures"]
      },
      "browserApis": {
        "apis": ["Web APIs used (FileReader, Camera, etc.)"],
        "permissions": ["Required browser permissions"],
        "compatibility": ["Browser support requirements"]
      },
      "goServices": {
        "aiGateway": ["AI service integrations"],
        "fileAccelerator": ["File processing services"],
        "memoryService": ["Memory management services"]
      }
    }
  }
}
```

## 2. Error Boundary & Edge Case Mapping

```json
{
  "errorBoundaries": {
    "frontendErrors": {
      "componentErrors": ["React error boundaries"],
      "networkErrors": ["API call failures"],
      "validationErrors": ["Form validation failures"],
      "userInputErrors": ["Invalid data handling"]
    },
    "backendErrors": {
      "validationErrors": ["Request validation failures"],
      "businessLogicErrors": ["Service layer errors"],
      "databaseErrors": ["Query failures, constraint violations"],
      "externalServiceErrors": ["Third-party API failures"]
    },
    "systemErrors": {
      "memoryErrors": ["Out of memory conditions"],
      "diskSpaceErrors": ["Storage limitations"],
      "networkErrors": ["Connection failures"],
      "timeoutErrors": ["Request timeout handling"]
    },
    "recoveryStrategies": {
      "retryMechanisms": ["Exponential backoff patterns"],
      "fallbackBehaviors": ["Alternative workflows"],
      "userNotifications": ["Error message display"],
      "dataRecovery": ["Partial data preservation"]
    }
  }
}
```

## 3. Performance & Optimization Mapping

```json
{
  "performanceConsiderations": {
    "frontendOptimizations": {
      "bundleSize": ["Component lazy loading"],
      "renderOptimization": ["React.memo, useMemo, useCallback"],
      "cacheStrategy": ["React Query cache configuration"],
      "loadingStates": ["Progressive loading patterns"]
    },
    "backendOptimizations": {
      "databaseOptimization": ["Query optimization, indexing"],
      "cacheStrategy": ["Redis cache patterns"],
      "serviceOptimization": ["Service layer efficiency"],
      "memoryManagement": ["Memory usage patterns"]
    },
    "dataTransferOptimization": {
      "payloadSize": ["Response data minimization"],
      "compression": ["gzip, file compression"],
      "streaming": ["Large data streaming patterns"],
      "pagination": ["Data pagination strategies"]
    }
  }
}
```

## 4. Security & Privacy Mapping

```json
{
  "securityConsiderations": {
    "authentication": {
      "userVerification": ["Authentication requirements"],
      "sessionManagement": ["Session handling"],
      "tokenValidation": ["JWT token verification"]
    },
    "authorization": {
      "permissions": ["User permission requirements"],
      "roleBasedAccess": ["Role verification"],
      "dataAccess": ["Data access controls"]
    },
    "dataProtection": {
      "sensitiveData": ["PII, health data handling"],
      "encryption": ["Data encryption requirements"],
      "storage": ["Secure storage practices"],
      "transmission": ["Secure data transmission"]
    },
    "inputValidation": {
      "frontendValidation": ["Client-side validation"],
      "backendValidation": ["Server-side validation"],
      "sanitization": ["Data sanitization"],
      "sqlInjectionPrevention": ["SQL injection protection"]
    }
  }
}
```

## 5. Integration Status & Evidence Blueprint

```json
{
  "integrationEvidence": {
    "implementationStatus": {
      "status": "active|partial|planned|broken",
      "lastVerified": "ISO 8601 timestamp",
      "verificationMethod": "automated|manual|integration-test",
      "evidenceLocation": "Path to test files or documentation"
    },
    "testingEvidence": {
      "unitTests": ["Component and service unit tests"],
      "integrationTests": ["End-to-end integration tests"],
      "manualTesting": ["Manual testing procedures"],
      "performanceTests": ["Load and performance testing"]
    },
    "deploymentEvidence": {
      "stagingValidation": ["Staging environment testing"],
      "productionValidation": ["Production deployment verification"],
      "rollbackProcedures": ["Rollback strategies"],
      "monitoringSetup": ["Production monitoring"]
    }
  }
}
```

## 6. Feature Size Management

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

### SHDL Optimization Benefits
- **Token efficiency**: 20% reduction in file size
- **Semantic density**: 15% increase in meaning per token
- **Processing speed**: 25% faster AI parsing
- **Cost reduction**: Significant savings for large codebases

## 7. Complete Feature Template

Use this template for mapping any feature:

```json
{
  "_metadata": {
    "featureName": "specific-feature-name",
    "featureGroup": "domain-group",
    "parentFile": "./domain.map.json",
    "domain": "primary-domain",
    "lastUpdated": "ISO 8601 timestamp",
    "mappingVersion": "2.0.0"
  },
  "description": "Clear, concise feature description",
  "userFlow": [
    "Step 1: User performs specific action",
    "Step 2: System responds with specific behavior",
    "Step 3: User sees specific result"
  ],
  "systemFlow": [
    "Process 1: Specific system operation",
    "Process 2: Data transformation or storage",
    "Process 3: Response generation"
  ],
  "dataFlowTrace": { /* Use blueprint from section 1.1 */ },
  "architecturalLayers": { /* Use blueprint from section 1.2 */ },
  "errorBoundaries": { /* Use blueprint from section 2 */ },
  "performanceConsiderations": { /* Use blueprint from section 3 */ },
  "securityConsiderations": { /* Use blueprint from section 4 */ },
  "integrationEvidence": { /* Use blueprint from section 5 */ },
  "dependencies": {
    "internal": ["Other features this depends on"],
    "external": ["Third-party services"],
    "cross-domain": ["Dependencies from other domains"]
  },
  "impacts": {
    "affects": ["Other features impacted by this feature"],
    "sharedComponents": ["Components used by multiple features"],
    "sharedServices": ["Services used by multiple features"]
  }
}
```

## 7. Implementation Workflow

### Step 1: Feature Discovery
1. Identify the primary user action/workflow
2. Trace the complete request path
3. Map all files that participate in the feature

### Step 2: Architectural Layer Mapping
1. Map presentation layer (React components, hooks, types)
2. Map business logic layer (routes, services, middleware)
3. Map data layer (database, cache, file system)
4. Map integration layer (external APIs, browser APIs, Go services)

### Step 3: Data Flow Tracing
1. Trace user action → frontend → backend → database
2. Trace response → backend → frontend → UI update
3. Map cache invalidation and UI refresh patterns
4. Document error flows and recovery strategies

### Step 4: Performance & Security Analysis
1. Identify performance bottlenecks
2. Map security requirements and implementations
3. Document optimization opportunities
4. Map monitoring and observability

### Step 5: Integration Evidence Collection
1. Verify implementation with tests
2. Document integration status with evidence
3. Map deployment and monitoring
4. Document known issues and gaps

This blueprint ensures every "leaf" of your feature "tree" is mapped, providing complete architectural visibility and enabling better maintenance, debugging, and optimization.
