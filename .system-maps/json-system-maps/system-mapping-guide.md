
# System Mapping Generation Guide for LLMs

## 🚨 MANDATORY FIRST CHECK (JSON Format)
```json
{
  "beforeAnyCreation": {
    "estimateDomainSize": "REQUIRED",
    "sizeConstraints": {
      "maxLines": 300,
      "maxFeatureGroups": 5,
      "violationAction": "CREATE_SUBDOMAIN_DIRECTORY"
    },
    "megaFeatureThreshold": {
      "maxLinesPerFeature": 100,
      "violationAction": "EXTRACT_TO_FEATURE_FILE"
    }
  }
}
```

## 1. Core Philosophy

The primary objective of a system map is to create a structured, queryable, and unambiguous representation of the application's architecture. This map serves as a "single source of truth" for understanding how different parts of the codebase connect, from user-facing features down to specific database tables.

This guide is not for human consumption; it is a technical instruction set for an LLM. The format must be adhered to precisely to ensure operational efficiency, minimize token cost, and maximize analytical accuracy. The chosen format is a federated set of JSON files, as this format's rigid structure is the most computationally efficient for an LLM to parse and reason about.

## 2. Domains vs Dependencies (CRITICAL DISTINCTION)

### 2.1. What is a Domain?
**Domains are top-level user-facing application areas** - the main sections users interact with:
- **User Pages/Sections**: `chat`, `health`, `file-manager`, `settings`
- **Infrastructure Systems**: `routes`, `infrastructure` (logging, performance, testing)

### 2.2. What are Dependencies?
**Dependencies are other domains that this domain relies on** - NOT sub-features:
- `chat` depends on `memory` (uses memory system)
- `chat` depends on `file-manager` (uses file attachments)
- `health` depends on `file-manager` (imports health files)

### 2.3. What are NOT Domains?
**These should be features within domains, NOT separate domains:**
- ❌ `conversation-history` → Feature within `chat` domain
- ❌ `attachments` → Feature within `chat` domain  
- ❌ `user-profile` → Feature within `settings` domain
- ❌ `metrics-dashboard` → Feature within `health` domain

## 3. Decision Framework (START HERE)

### 2.1. File Size Creation Rules (MANDATORY ENFORCEMENT)

**🚨 CRITICAL: Always estimate domain size BEFORE creating system maps**

-   **Sub-Domain Directory Structure Required when:**
    -   A domain analysis indicates it would require more than **300 lines** in a single file.
    -   OR the domain would contain more than **5** top-level `featureGroups`.
    -   **PROACTIVE ACTION:** Create directory structure (e.g., `/.system-maps/[domain]/`) and split `featureGroups` into logical sub-domain map files (e.g., `[feature-group-A].map.json`). Update `root.map.json` path to point to the directory.

-   **Mega-Feature File Required when:**
    -   A single feature analysis indicates it would exceed **100 lines** in JSON definition.
    -   **PROACTIVE ACTION:** Create `[feature-name].feature.json` file immediately. Reference with `$ref` pointer in parent domain map.

### 2.2. Domain vs Sub-Domain Decision Criteria

**Core Domains** (main user-facing application sections):
- Complete user workflows with UI, API, and database operations
- Examples: `chat` (messaging + history), `health` (dashboard + data), `file-manager` (upload + organize), `settings` (preferences + config)

**Infrastructure Domains** (cross-cutting technical concerns):
- Referenced by core domains using `$ref`, not standalone user features
- Examples: `routes` (API routing), `infrastructure` (logging, performance, testing)

**Memory as Special Case**:
- `memory` is a domain because it's a complete AI system with its own UI section and complex logic
- Other domains depend on `memory` for AI context and intelligent features

**Sub-Domain Triggers:**
- Domain has distinct user workflow areas
- Natural feature groupings exist
- Domain spans multiple database schemas
- Team ownership boundaries exist

## 3. Core Concepts & Requirements

### 3.1. Integration Status Validation (MANDATORY)

Integration status cannot be marked as "active" without validation evidence:

1. **Component-to-API Call Tracing**: Document actual `fetch()`, `queryKey`, and API calls in component code
2. **Endpoint Verification**: Validate that component calls match server route implementations  
3. **UI Refresh Dependency Chain Validation**: Verify all dependent UI components refresh after successful API operations
4. **Integration Testing Evidence**: Proof of end-to-end functionality

**Status Levels:**
- `active`: Implemented, tested, working end-to-end with complete UI consistency
- `partial`: Implemented but has known gaps or incomplete functionality
- `planned`: Designed but not yet implemented
- `broken`: Exists but fails during execution

### 3.2. Cache Invalidation Patterns (WITH EXAMPLES)

**CRITICAL**: Features that modify data must document complete refresh chain:

```json
"cacheDependencies": {
  "invalidates": [
    "query:healthVisibilitySettings",
    "query:/api/health-consent/visibility"
  ],
  "refreshesComponents": [
    "HealthDataSection", 
    "KeyMetricsOverview"
  ]
}
```

**Common Patterns:**
- **Query Key Invalidation**: `query:specificEndpoint` format
- **Component Refresh**: List all components displaying same data
- **Hook Consistency**: Ensure synchronized caching strategies
- **Cross-Domain Dependencies**: Document when one domain affects another

**Example Cache Chains:**
```json
// Health data update chain
"cacheDependencies": {
  "invalidates": ["query:healthData", "query:healthMetrics"],
  "refreshesComponents": ["HealthDashboard", "MetricsCard", "TrendChart"],
  "triggerEvents": ["health-data-updated", "metrics-recalculated"]
}

// Chat message chain  
"cacheDependencies": {
  "invalidates": ["query:messages", "query:conversations"],
  "refreshesComponents": ["MessageDisplayArea", "ConversationHistory"],
  "triggerEvents": ["message-sent", "conversation-updated"]
}
```

### 3.3. UI Refresh Dependency Requirements

1. **Cache Invalidation Mapping**: Document which query keys need invalidation
2. **Cross-Component Dependencies**: Identify all components displaying same data  
3. **Hook Consistency Validation**: Ensure different hooks have synchronized caching
4. **End-to-End User Flow Testing**: Validate complete user experience works

## 4. Implementation Workflow (STEP-BY-STEP)

### Step 1: Initialize System Maps Directory
1. Create `/.system-maps/` directory if it doesn't exist
2. Start with `root.map.json` - provides foundational context

### Step 2: Domain Analysis & Planning
1. **Identify Entry Points**: Primary UI components or server routes
2. **Estimate Complexity**: Count potential features and file size
3. **Choose Structure**: Single file vs directory based on size rules
4. **Plan Dependencies**: Identify cross-domain relationships

### Step 3: Recursive Dependency Analysis (CRITICAL)
1. **Start with Entry Points**: Load primary domain files
2. **Analyze Imports**: Read all `import` statements meticulously  
3. **Recursively Follow**: Read and analyze each discovered dependency
4. **Continue Until Complete**: Map all files contributing to user-facing features

### Step 4: Flow Tracing & Integration Mapping
1. **Trace User Flows**: From UI interaction through client logic to API
2. **Map API to Database**: From endpoint through services to database tables
3. **Document Cache Dependencies**: Map complete refresh chains
4. **Validate Integration Status**: Verify actual working implementations

### Step 5: Validation & Documentation
1. **Test Integration Points**: Verify component-to-API connections
2. **Validate Cache Invalidation**: Test complete refresh chains
3. **Document Known Issues**: Record gaps and incomplete functionality  
4. **Update Integration Status**: Mark accurate status levels

## 5. File Schema Definition

### 5.1. `root.map.json` (No Table of Contents Required)

```json
{
  "appName": "String",
  "version": "String", 
  "lastUpdated": "String (ISO 8601 timestamp)",
  "domains": {
    "[domainName]": {
      "description": "String: Domain purpose summary",
      "path": "String (relative path to file OR directory)",
      "dependencies": ["String: Array of other domain keys"]
    }
  }
}
```

### 5.2. Domain Map Schema (e.g., `health.map.json`)

```json
{
  "tableOfContents": {
    "[groupName]": {
      "features": ["feature-name-1", "feature-name-2"],
      "components": ["ComponentA", "ComponentB"],
      "endpoints": ["POST /api/domain/action", "GET /api/domain/data"]
    }
  },
  "integrationStatus": {
    "[feature-name]": {
      "status": "active|partial|planned|broken", 
      "lastVerified": "2025-01-XX",
      "knownIssues": ["API endpoint mismatch", "Component not integrated"]
    }
  },
  "lastUpdated": "String (ISO 8601 timestamp)",
  "dependencies": ["String (list of other domains)"],
  "featureGroups": {
    "[groupName]": {
      "description": "String: Feature group purpose",
      "features": {
        "[feature-name]": {
          "description": "String: Clear feature description",
          "userFlow": [
            "Step 1: User clicks send button", 
            "Step 2: User sees loading indicator"
          ],
          "systemFlow": [
            "Validate message content",
            "Store in database via POST /api/chat", 
            "Trigger AI processing",
            "Stream response"
          ],
          "components": ["ComponentName"],
          "apiIntegration": {
            "expectedEndpoints": ["PATCH /api/health-consent/visibility"],
            "actualEndpoints": ["PATCH /api/health-consent"], 
            "integrationGaps": ["visibility endpoint missing"],
            "cacheDependencies": {
              "invalidates": ["query:healthVisibilitySettings"],
              "refreshesComponents": ["HealthDataSection"]
            },
            "uiConsistencyValidation": {
              "tested": false,
              "knownIssues": ["UI components don't refresh after API calls"]
            }
          },
          "logging": {
            "$ref": "/.system-maps/infrastructure/logging.map.json#/health-logging"
          },
          "performance": {
            "$ref": "/.system-maps/infrastructure/performance.map.json#/health-performance"  
          },
          "tests": ["String (path to test file)"]
        }
      }
    }
  },
  "components": { "...": "..." },
  "apiEndpoints": { "...": "..." }, 
  "database": { "...": "..." },
  "componentDetails": {
    "[ComponentName]": {
      "path": "String (file path)",
      "keyFunctions": {
        "[functionName]": "String (brief description of what it does)"
      },
      "hooks": ["List of custom hooks used"],
      "stateManagement": "Description of key state variables",
      "dataProcessing": "How component processes/transforms data"
    }
  }
}
```

### 5.3. Mega-Feature File Schema (`.feature.json`)

```json
{
  "_metadata": {
    "featureName": "health-data-import",
    "featureGroup": "data-operations",
    "parentFile": "./dashboard.map.json", 
    "domain": "health"
  },
  "description": "Feature description",
  "userFlow": ["Step 1", "Step 2"],
  "systemFlow": ["Process 1", "Process 2"],
  "components": {
    "$ref": "../dashboard.map.json#/components"
  },
  "apiEndpoints": {
    "$ref": "../dashboard.map.json#/apiEndpoints" 
  },
  // Optional infrastructure references (only if used)
  "logging": {
    "$ref": "/.system-maps/infrastructure/logging.map.json#/health-logging"
  },
  "componentDetails": {
    "[ComponentName]": {
      "path": "String (file path)",
      "keyFunctions": {
        "[functionName]": "String (brief description)"
      }
    }
  }
}
```

### 5.4. Component Detail Requirements (CRITICAL)

**Purpose**: Document all "furthest leaves" - the actual implementation details that make features work.

**What to Include**:
- **Key Functions**: Every significant function in a component (e.g., `aggregateMetrics`, `calculateChange`)
- **Hooks**: Custom hooks and their purpose (e.g., `useHealthDataApi`)
- **State Variables**: Critical state that controls behavior (e.g., `timeRange`, `isLoading`)
- **Data Transformations**: How data is processed (e.g., "groups by dataType then aggregates")
- **Utility Functions**: Helper functions that perform core logic

**Example**:
```json
"componentDetails": {
  "HealthMetricsCard": {
    "path": "client/src/components/HealthMetricsCard.tsx",
    "keyFunctions": {
      "aggregateMetrics": "Aggregates metrics by type (sum/average/latest)",
      "filteredMetrics": "Filters based on visibility settings",
      "formatMetricName": "Converts snake_case to Title Case"
    },
    "stateManagement": "Receives metrics array prop, no internal state",
    "dataProcessing": "Groups metrics by dataType, applies aggregation"
  }
}
```

**Why This Matters**: When debugging, developers need to know which functions handle what logic. The system map should be detailed enough that someone can navigate directly to the relevant code.

**What NOT to Include**:
- Debugging hints or "how to fix" instructions
- Historical bugs or previous implementations
- Code snippets or implementation details
- Testing steps or debugging procedures
- Personal observations about code quality

**Keep It Neutral**: System maps document architecture, not opinions or history.

## 6. Architecture: Hybrid Federated Maps

### 6.1. Core Architecture Components

- **Root Map**: Single source of truth manifest pointing to domain entry points
- **Core Domain Maps**: User-facing application areas with complete functionality mapping
- **Infrastructure Maps**: Cross-cutting concerns referenced by core domains using `$ref`
- **Sub-Domain Directories**: Complex domains split into focused sub-domain map files
- **Mega-Feature Files**: Large isolated features extracted with `$ref` references

### 6.2. Refactoring Triggers (If Rules Were Missed)

**🚨 IMMEDIATE REFACTORING REQUIRED**: Any existing file exceeding 300 lines or 5 feature groups must be split immediately.

## 7. Data Flow Tracing & Architectural Mapping

### 7.1. Complete Data Flow Tracing (MANDATORY)

**Objective**: Map the complete journey from user action to database and back to UI refresh.

#### 7.1.1. User Action → Frontend Flow
```json
"dataFlow": {
  "userAction": {
    "trigger": "User clicks send button in ChatInputArea",
    "component": "ChatInputArea.tsx",
    "eventHandler": "handleSendMessage",
    "stateChanges": ["setIsLoading(true)", "setMessages(optimistic)"]
  },
  "frontendProcessing": {
    "hooks": ["useStreamingChat", "useChatActions"],
    "queryKeys": ["messages", "conversations"],
    "apiCall": {
      "endpoint": "POST /api/chat/send",
      "payload": "{ message, conversationId, attachments }",
      "headers": "{ Authorization, Content-Type }"
    }
  }
}
```

#### 7.1.2. Network Layer → Backend Flow
```json
"networkFlow": {
  "routeMatching": "POST /api/chat/send → chat-routes.ts",
  "middleware": ["authMiddleware", "validationMiddleware"],
  "routeHandler": "sendMessage",
  "servicesCalled": ["ChatContextService", "AiService", "MemoryService"],
  "businessLogic": [
    "Validate message content",
    "Build conversation context",
    "Process through AI provider",
    "Detect and store memories"
  ]
}
```

#### 7.1.3. Database Operations Flow
```json
"databaseFlow": {
  "operations": [
    {
      "type": "INSERT",
      "table": "messages",
      "query": "INSERT INTO messages (content, conversation_id, role) VALUES (?, ?, ?)",
      "purpose": "Store user message"
    },
    {
      "type": "SELECT",
      "table": "messages",
      "query": "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 20",
      "purpose": "Load conversation history"
    }
  ],
  "transactions": "Single transaction for message + memory operations",
  "indexes": ["idx_messages_conversation_id", "idx_messages_created_at"]
}
```

#### 7.1.4. Response Flow → Frontend Update
```json
"responseFlow": {
  "dataTransformation": "AI response → streaming chunks → final message",
  "cacheInvalidation": ["query:messages", "query:conversations"],
  "uiUpdates": [
    "MessageDisplayArea re-renders",
    "ConversationHistory updates",
    "Loading states cleared"
  ],
  "errorHandling": "Toast notifications for failures"
}
```

### 7.2. Architectural Layers Mapping (COMPREHENSIVE)

#### 7.2.1. Presentation Layer Architecture
```json
"presentationLayer": {
  "components": {
    "primary": [
      {
        "name": "ChatInputArea",
        "path": "client/src/components/ChatInputArea.tsx",
        "purpose": "Message input and file attachments",
        "dependencies": ["AttachmentPreview", "AudioRecorder"]
      }
    ],
    "supporting": [
      {
        "name": "SmoothStreamingText",
        "path": "client/src/components/SmoothStreamingText.tsx",
        "purpose": "Natural typing animation for AI responses"
      }
    ]
  },
  "hooks": {
    "state": ["useStreamingChat", "useChatActions"],
    "api": ["useChatMessages", "useOptimisticUpdates"],
    "performance": ["useVirtualScrolling", "useStaggeredLoading"]
  },
  "utilities": {
    "helpers": ["chatUtils.tsx", "fileManagerUtils.ts"],
    "types": ["fileManager.ts", "shared/schema.ts"]
  }
}
```

#### 7.2.2. Business Logic Layer Architecture
```json
"businessLogicLayer": {
  "routes": {
    "handlers": [
      {
        "path": "server/routes/chat-routes.ts",
        "endpoints": ["POST /api/chat/send", "GET /api/chat/conversations"],
        "middleware": ["authMiddleware", "rateLimitMiddleware"]
      }
    ]
  },
  "services": {
    "core": [
      {
        "name": "ChatContextService",
        "path": "server/services/chat-context-service.ts",
        "purpose": "Build conversation context with memories"
      },
      {
        "name": "AiService", 
        "path": "server/services/ai-service.ts",
        "purpose": "Handle AI provider communication"
      }
    ],
    "supporting": [
      {
        "name": "MemoryService",
        "path": "server/services/memory-service.ts", 
        "purpose": "Background memory detection and storage"
      }
    ]
  }
}
```

#### 7.2.3. Data Layer Architecture
```json
"dataLayer": {
  "database": {
    "tables": [
      {
        "name": "messages",
        "columns": ["id", "content", "conversation_id", "role", "created_at"],
        "indexes": ["idx_messages_conversation_id", "idx_messages_created_at"],
        "relationships": ["FOREIGN KEY conversation_id → conversations.id"]
      },
      {
        "name": "conversations", 
        "columns": ["id", "title", "created_at", "updated_at"],
        "indexes": ["idx_conversations_updated_at"]
      }
    ],
    "migrations": ["create_messages_table.sql", "add_message_indexes.sql"]
  },
  "cache": {
    "strategy": "React Query with 5-minute TTL",
    "keys": ["messages", "conversations", "memory-contexts"],
    "invalidation": "Optimistic updates + server revalidation"
  },
  "fileStorage": {
    "location": "uploads/ directory",
    "types": ["images", "documents", "audio"],
    "processing": "Go microservice for large files"
  }
}
```

### 7.3. Component-to-API Call Tracing (DETAILED)

#### 7.3.1. Tracing Methodology
1. **Component Discovery**: Identify all React components that make API calls
2. **Hook Analysis**: Map custom hooks to specific API endpoints  
3. **Query Key Mapping**: Document React Query keys and their associated endpoints
4. **Integration Validation**: Verify actual API calls match documented endpoints

#### 7.3.2. Component-API Mapping Template
```json
"componentApiTracing": {
  "ChatInputArea": {
    "apiCalls": [
      {
        "hook": "useStreamingChat",
        "endpoint": "POST /api/chat/send",
        "queryKey": "messages",
        "triggerEvent": "handleSendMessage click",
        "actualImplementation": "Verified in chat-routes.ts",
        "integrationStatus": "active"
      }
    ],
    "dependencies": [
      {
        "component": "AttachmentPreview", 
        "apiCall": "POST /api/files/upload",
        "integrationGap": "None - fully integrated"
      }
    ]
  }
}
```

#### 7.3.3. API Integration Validation Rules
- **Endpoint Verification**: Every documented API call must exist in route handlers
- **Payload Matching**: Request/response structures must match across frontend/backend
- **Error Handling**: Document error scenarios and frontend error handling
- **Cache Consistency**: Verify cache invalidation triggers UI refresh

### 7.4. Request/Response Cycle Documentation (END-TO-END)

#### 7.4.1. Complete Cycle Template
```json
"requestResponseCycle": {
  "feature": "send-chat-message",
  "cycle": {
    "step1_userAction": {
      "description": "User types message and clicks send",
      "component": "ChatInputArea",
      "eventHandler": "handleSendMessage",
      "timing": "0ms"
    },
    "step2_frontendProcessing": {
      "description": "Optimistic UI update and API call preparation",
      "stateChanges": ["isLoading: true", "messages: [...existing, optimistic]"],
      "hookInvocation": "useStreamingChat.mutate()",
      "timing": "10ms"
    },
    "step3_networkRequest": {
      "description": "HTTP request sent to backend",
      "endpoint": "POST /api/chat/send",
      "headers": {"Authorization": "Bearer token", "Content-Type": "application/json"},
      "payload": {"message": "user input", "conversationId": "uuid"},
      "timing": "50ms"
    },
    "step4_backendProcessing": {
      "description": "Server processes request through business logic",
      "routeHandler": "sendMessage in chat-routes.ts",
      "servicesInvoked": ["ChatContextService", "AiService", "MemoryService"],
      "databaseQueries": [
        "INSERT message",
        "SELECT conversation history",
        "INSERT detected memories"
      ],
      "timing": "200ms"
    },
    "step5_responseGeneration": {
      "description": "AI provider generates streaming response",
      "provider": "OpenAI GPT-4",
      "streamingChunks": "~50 chunks over 3 seconds",
      "timing": "3000ms"
    },
    "step6_frontendUpdate": {
      "description": "UI updates with streaming response",
      "cacheInvalidation": ["query:messages"],
      "componentUpdates": ["MessageDisplayArea", "ConversationHistory"],
      "stateChanges": ["isLoading: false", "messages: [...existing, aiResponse]"],
      "timing": "3050ms"
    }
  },
  "totalCycleTime": "3050ms",
  "criticalPath": ["userAction", "networkRequest", "backendProcessing", "responseGeneration"],
  "errorScenarios": [
    "Network failure → Show retry button",
    "AI provider timeout → Fallback message",
    "Database error → Preserve optimistic update"
  ]
}
```

#### 7.4.2. Performance Metrics Documentation
```json
"performanceMetrics": {
  "targetMetrics": {
    "firstResponse": "<100ms",
    "streamingStart": "<500ms", 
    "fullResponse": "<5000ms"
  },
  "bottleneckAnalysis": {
    "databaseQueries": "Optimized with indexes",
    "aiProvider": "Primary bottleneck - external service",
    "memoryProcessing": "Background non-blocking"
  },
  "optimizations": [
    "Optimistic updates for immediate feedback",
    "Streaming responses for progressive display", 
    "Background memory processing"
  ]
}
```

## 8. Discovery Tools & Analysis Methods

### 8.1. Recommended Tool Usage
- **Entry Point Discovery**: Use `glob` and `search_file_content` to find initial files
- **Recursive Analysis**: Use `read_file` and `read_many_files` extensively  
- **API Mapping**: Analyze server-side route handlers to populate `apiEndpoints`
- **Database Schema**: Analyze schema files and SQL migrations for `database` section
- **Data Flow Tracing**: Follow imports and function calls across file boundaries
- **Integration Testing**: Verify actual API calls match documented endpoints

### 8.2. Analysis Constraints
1. **Domain Focus**: Only focus on one domain per system map
2. **Integration Gaps**: Document unintegrated code at end of system map
3. **Critical Misses**: Only modify other system maps if critical miss detected (explain why)
4. **End-to-End Verification**: Validate complete data flow from UI to database
5. **Performance Documentation**: Include timing and optimization considerations

### 8.3. Required Documentation Standards
- **Data Flow**: Complete user action → database → response cycle
- **Component Integration**: Verified component-to-API call relationships  
- **Performance Metrics**: Target timing and bottleneck analysis
- **Error Handling**: Complete error scenario documentation
- **Cache Strategy**: Invalidation patterns and consistency validation

This guide is the definitive specification and must be followed without deviation to ensure system maps remain reliable and efficient tools for codebase analysis and modification.
