
# Optimized 100% Feature Mapping Blueprint

## Core Philosophy: Complete Trace Coverage

## Core Philosophy: Tree-Based Architecture Mapping

Each feature is a **tree** where:
- **Root**: The feature/functionality itself
- **Trunk**: Core user workflow and primary components
- **Branches**: All architectural layers (frontend, backend, database, services)
- **Leaves**: Every element that touches the feature (files, APIs, database tables, external services, browser APIs, etc.)

Hence, every feature mapping must capture the **complete data journey** from user action to database and back, including every file, component, API, cache invalidation, and side effect.

## User flows
How the user interacts with the application is described in ./tasks/all-user-flows.

## 1. System Map Structure

### Required Table of Contents
Every system map must start with a brief table of contents listing all mapped features:

```json
{
  "_tableOfContents": {
    "domain": "domain-name",
    "features": [
      "feature-1-name",
      "feature-2-name", 
      "feature-3-name"
    ],
    "totalFeatures": 3,
    "lastUpdated": "2025-01-XX"
  }
}
```

### Ultra-Compact Feature Schema
Use this minimal JSON structure to capture 100% of feature connections:

```json
{
  "_meta": {
    "feature": "feature-name",
    "domain": "parent-domain",
    "lastUpdated": "2025-01-XX",
    "status": "active|partial|planned|broken"
  },
  "trigger": "Specific user action that starts this feature",
  "dataFlow": {
    "request": "Component → Hook → API → Service → Database",
    "response": "Database → Service → API → Hook → UI Update",
    "sideEffects": ["Cache invalidation", "Other feature triggers"]
  },
  "files": {
    "ui": ["Component.tsx", "Hook.ts"],
    "api": ["route.ts", "service.ts"],
    "data": ["table_name", "cache_key"],
    "types": ["types.ts"]
  },
  "cacheFlow": {
    "invalidates": ["query:specific-endpoint"],
    "refreshes": ["ComponentA", "ComponentB"],
    "triggers": ["dependent-feature-updates"]
  },
  "errorPaths": {
    "network": "Fallback behavior",
    "validation": "Error handling",
    "business": "Recovery strategy"
  },
  "dependencies": {
    "internal": ["other-features"],
    "external": ["third-party-services"],
    "shared": ["common-components"]
  }
}
```

## 2. Complete Trace Validation Checklist

For each feature, verify these traces are documented:

### User Interaction Trace
- [ ] **Trigger Event**: Exact user action (click, input, etc.)
- [ ] **UI Component**: Specific component handling the event
- [ ] **Event Handler**: Function processing the user action

### Frontend Data Flow Trace
- [ ] **State Changes**: React state updates triggered
- [ ] **Hook Calls**: Custom hooks invoked
- [ ] **Query Keys**: React Query keys used
- [ ] **API Calls**: Exact endpoints called with methods

### Backend Processing Trace
- [ ] **Route Handler**: Express route receiving the request
- [ ] **Middleware**: Authentication, validation, etc.
- [ ] **Service Functions**: Business logic services called
- [ ] **Database Operations**: Tables accessed, queries executed
- [ ] **External APIs**: Third-party services called

### Response & Update Trace
- [ ] **Data Transformation**: How response is shaped
- [ ] **Cache Updates**: Query invalidations triggered
- [ ] **UI Refresh**: Components that re-render
- [ ] **State Sync**: Frontend state consistency
- [ ] **User Feedback**: Loading states, success/error messages

### Side Effect Trace
- [ ] **Cross-Feature Impact**: Other features affected
- [ ] **Background Jobs**: Async processing triggered
- [ ] **File System**: File operations performed
- [ ] **Memory Updates**: AI memory changes
- [ ] **Notifications**: User notifications sent

## 3. System Map Update Workflow

### CRITICAL: System Map Update Process
When asked to "update a system map using this guide", follow this **explicit 3-phase process**:

**IMPORTANT**: You MUST always complete ALL THREE PHASES. Do not skip Phase 2 (Implementation Verification) - it is essential to verify the system map against actual code before making updates.

### Phase 1: Analysis & Issue Discovery (5-10 minutes)
1. **Examine Current System Map**: Read the existing system map thoroughly
2. **Identify Potential Issues**: Look for inconsistencies, outdated information, missing details
3. **Document Suspected Problems**: List all potential issues found in the system map

### Phase 2: Implementation Verification (10-15 minutes)
1. **Read Actual Implementation Files**: Examine the real code files mentioned in the system map
2. **Verify System Map Accuracy**: Compare system map claims against actual implementation
3. **Confirm Real Issues**: Distinguish between actual bugs and documentation gaps
4. **Document Confirmed Issues**: List verified problems with evidence from code

### Phase 3: System Map Update (5-10 minutes)
1. **Fix Documented Inconsistencies**: Update system map to match actual implementation
2. **Add Missing Information**: Include details not captured in original map
3. **Update Metadata**: Change lastUpdated timestamp and status if needed
4. **Validate Completeness**: Ensure updated map covers all implementation aspects

### Essential Update Steps

#### Step 1: Issue Analysis (5 minutes)
1. Read existing system map completely
2. Check for logical inconsistencies
3. Identify missing implementation details
4. Note outdated or incorrect information

#### Step 2: Code Verification (5 minutes)
1. Read all files listed in the system map
2. Follow actual data flow in the code
3. Verify API endpoints and responses match
4. Check database schema alignment
5. Validate component behavior

#### Step 3: Implementation Validation (3 minutes)
1. Verify actual API calls match expected endpoints
2. Test cache invalidation triggers UI refresh
3. Validate error handling works end-to-end
4. Confirm all dependencies are functional

#### Step 4: Map Correction (5 minutes)
1. Update incorrect API endpoints/responses
2. Fix database schema mismatches
3. Correct component behavior descriptions
4. Add missing error paths or dependencies

#### Step 5: Documentation Sync (2 minutes)
1. Ensure file paths are accurate
2. Update data flow descriptions to match code
3. Correct cache invalidation patterns
4. Fix any cross-domain interaction details

#### Step 6: Root Map Update (2 minutes)
1. **REQUIRED**: Update `.system-maps/json-system-maps/root.map.json` after creating or modifying any system map
2. Add new domains, subdomains, or features to the central index
3. Update lastUpdated timestamp in root.map.json
4. Verify all paths are correct and accessible

### System Map Update Expectations

When you receive a request like "update the memory UI system map using this guide", you should:

1. **ALWAYS follow the 3-phase process above**
2. **Phase 1**: Examine the current memory UI system map for inconsistencies
3. **Phase 2**: Read and verify actual implementation files (MemorySection.tsx, memory-routes.ts, schema.ts, etc.)
4. **Phase 3**: Update the system map with correct information based on actual code
5. **Document your findings**: Clearly explain what issues you found and what you corrected

**DO NOT**: Simply read the guide and explain what you would do. **DO**: Actually perform the analysis, verification, and update process.

## 4. Token-Optimized Templates

### Micro Feature (< 20 lines)
```json
{
  "_meta": {"feature": "toggle-setting", "domain": "settings", "status": "active"},
  "trigger": "User clicks toggle switch",
  "dataFlow": {
    "request": "ToggleSwitch → useSettings → PATCH /api/settings",
    "response": "Database → API → Hook → Toggle UI update"
  },
  "files": {
    "ui": ["ToggleSwitch.tsx", "useSettings.ts"],
    "api": ["settings-routes.ts"],
    "data": ["user_settings"]
  },
  "cacheFlow": {
    "invalidates": ["query:settings"],
    "refreshes": ["SettingsPanel"]
  }
}
```

### Standard Feature (20-50 lines)
```json
{
  "_meta": {"feature": "send-message", "domain": "chat", "status": "active"},
  "trigger": "User clicks send button after typing message",
  "dataFlow": {
    "request": "ChatInput → useStreamingChat → POST /api/chat → ai-service → database",
    "response": "ai-service streaming → MessageDisplay → UI updates",
    "sideEffects": ["Memory creation", "File attachment processing"]
  },
  "files": {
    "ui": ["ChatInputArea.tsx", "MessageDisplayArea.tsx", "useStreamingChat.ts"],
    "api": ["chat-routes.ts", "ai-service.ts", "memory-service.ts"],
    "data": ["messages", "conversations", "memories"],
    "types": ["schema.ts"]
  },
  "cacheFlow": {
    "invalidates": ["query:messages", "query:conversations"],
    "refreshes": ["MessageDisplayArea", "ConversationHistory"],
    "triggers": ["memory-creation"]
  },
  "errorPaths": {
    "network": "Retry with exponential backoff",
    "streaming": "Fallback to non-streaming response",
    "ai": "Show error message, allow retry"
  },
  "dependencies": {
    "internal": ["memory-system", "file-attachments"],
    "external": ["OpenAI API", "Google AI"],
    "shared": ["StreamingText", "ErrorBoundary"]
  }
}
```

### Complex Feature (50+ lines) → Extract to .feature.json
For features requiring more than 50 lines, create a separate `.feature.json` file and reference it:

```json
{
  "_meta": {"feature": "health-data-import", "domain": "health", "status": "active"},
  "$ref": "./health-data-import.feature.json"
}
```

## 5. Quality Gates

Before marking a feature as "active", verify:

1. **Complete Trace**: Every step from user action to database and back is documented
2. **File Coverage**: Every participating file is listed
3. **Cache Consistency**: All cache invalidations are mapped to UI refreshes
4. **Error Handling**: All failure modes have documented recovery strategies
5. **Integration Evidence**: Feature has been tested end-to-end
6. **Dependency Mapping**: All internal and external dependencies are documented
7. **Central Index Updated**: `.system-maps/json-system-maps/root.map.json` has been updated with new/modified system maps

## 6. Cross-Domain Consistency Requirements

### Critical: Preventing Cross-Domain Issues

When features across different domains interact (e.g., chat uploads vs file manager uploads affecting the same UI), system maps must explicitly document behavioral differences to prevent integration issues.

#### Required Cross-Domain Documentation

For any feature that shares components, endpoints, or affects the same UI across domains:

```json
{
  "crossDomainInteractions": {
    "sharedComponents": [
      {
        "component": "FileList.tsx", 
        "domains": ["chat", "file-manager"],
        "behaviorDifferences": {
          "chat": "Uploads skip compression for immediate thumbnails",
          "file-manager": "Applies smart compression (skip media files)"
        }
      }
    ],
    "sharedEndpoints": [
      {
        "endpoint": "/api/upload",
        "usedBy": ["chat.attachments", "file-manager.upload"],
        "processingDifferences": "Chat bypasses compression, file-manager applies smart compression"
      }
    ],
    "impactAnalysis": {
      "thumbnailDisplay": "Different compression paths affect thumbnail generation timing",
      "userExperience": "Chat shows immediate thumbnails, file-manager may show icons initially"
    }
  }
}
```

#### Cross-Domain Validation Checklist

- [ ] **Shared Component Behavior**: Document any behavioral differences when same component is used across domains
- [ ] **Endpoint Usage Patterns**: Map different processing flows for shared API endpoints
- [ ] **UI Consistency**: Ensure similar operations produce consistent user experiences
- [ ] **Compression/Processing Logic**: Document when/why different domains apply different processing
- [ ] **Cache Dependencies**: Map cross-domain cache invalidation requirements
- [ ] **Error Handling**: Ensure error handling is consistent across domains for shared operations

#### Automated Validation

Run the cross-domain validator after any system map changes:

```bash
node system-map-cross-domain-validator.js
```

This script automatically detects:
- Shared components with inconsistent behaviors
- Endpoint collisions with different processing
- Undocumented cross-domain dependencies
- Behavioral divergence in similar operations

#### Common Cross-Domain Patterns to Document

1. **File Upload Variations**: Different compression, processing, or validation logic
2. **Shared UI Components**: Same component with different data sources or behaviors  
3. **API Endpoint Reuse**: Same endpoint with different request/response processing
4. **Cache Consistency**: Cross-domain cache invalidation requirements
5. **Error Handling**: Consistent error messaging across similar operations

### Root Map Cross-Domain Tracking

Update `root.map.json` to include cross-domain dependency mappings:

```json
{
  "crossDomainDependencies": {
    "chat → file-manager": {
      "reason": "Chat uploads affect file manager thumbnail display",
      "sharedComponents": ["FileList.tsx", "AttachmentPreview.tsx"],
      "behaviorDifferences": "compression handling",
      "lastValidated": "2025-01-XX"
    }
  }
}
```

## 7. Benefits of This Approach

- **Token Efficient**: 15-50 lines vs 300+ lines for same coverage
- **Complete Coverage**: Nothing is missed in the feature trace
- **LLM Friendly**: JSON structure is computationally efficient to parse
- **Maintainable**: Developers can actually use and update these maps
- **Queryable**: Easy to extract specific information
- **Scalable**: Federated approach handles large codebases
- **Cross-Domain Safe**: Prevents integration issues between domains

This blueprint ensures **100% feature coverage** while being practical for both humans and LLMs to work with efficiently, with explicit cross-domain consistency validation.
