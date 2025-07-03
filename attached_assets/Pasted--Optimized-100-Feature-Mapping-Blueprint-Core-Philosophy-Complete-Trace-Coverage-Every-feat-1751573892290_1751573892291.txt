
# Optimized 100% Feature Mapping Blueprint

## Core Philosophy: Complete Trace Coverage

Every feature mapping must capture the **complete data journey** from user action to database and back, including every file, component, API, cache invalidation, and side effect.

## 1. Ultra-Compact Feature Schema

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

## 3. Implementation Workflow

### Step 1: Trace Discovery (5 minutes)
1. Identify the primary user trigger
2. Follow the complete request path in code
3. Map the complete response path back to UI
4. Document all side effects and dependencies

### Step 2: File Enumeration (3 minutes)
1. List every file that participates in the feature
2. Categorize by layer (UI, API, Data, Types)
3. Include shared components and utilities
4. Document external dependencies

### Step 3: Cache Flow Mapping (2 minutes)
1. Identify all cache keys that need invalidation
2. List all components that need to refresh
3. Map dependent features that need updates
4. Document cache consistency requirements

### Step 4: Error Boundary Documentation (2 minutes)
1. Map network failure handling
2. Document validation error flows
3. Identify business logic error recovery
4. Test error path completeness

### Step 5: Integration Verification (3 minutes)
1. Verify actual API calls match expected endpoints
2. Test cache invalidation triggers UI refresh
3. Validate error handling works end-to-end
4. Confirm all dependencies are functional

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

## 6. Benefits of This Approach

- **Token Efficient**: 15-50 lines vs 300+ lines for same coverage
- **Complete Coverage**: Nothing is missed in the feature trace
- **LLM Friendly**: JSON structure is computationally efficient to parse
- **Maintainable**: Developers can actually use and update these maps
- **Queryable**: Easy to extract specific information
- **Scalable**: Federated approach handles large codebases

This blueprint ensures **100% feature coverage** while being practical for both humans and LLMs to work with efficiently.
