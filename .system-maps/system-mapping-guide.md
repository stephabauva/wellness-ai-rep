
# System Mapping Generation Guide for LLMs

## 1. Core Philosophy

The primary objective of a system map is to create a structured, queryable, and unambiguous representation of the application's architecture. This map serves as a "single source of truth" for understanding how different parts of the codebase connect, from user-facing features down to specific database tables.

This guide is not for human consumption; it is a technical instruction set for an LLM. The format must be adhered to precisely to ensure operational efficiency, minimize token cost, and maximize analytical accuracy. The chosen format is a federated set of JSON files, as this format's rigid structure is the most computationally efficient for an LLM to parse and reason about.

## 2. Decision Framework (START HERE)

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

**Core Domains** (user-facing application areas):
- Business logic, UI components, API endpoints, database operations
- Examples: `chat`, `health`, `file-manager`, `settings`, `connected-devices`, `memory`

**Infrastructure Domains** (cross-cutting concerns):
- Referenced by core domains, not standalone
- Examples: `logging`, `performance`, `testing`

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
  "database": { "...": "..." }
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
  }
}
```

## 6. Architecture: Hybrid Federated Maps

### 6.1. Core Architecture Components

- **Root Map**: Single source of truth manifest pointing to domain entry points
- **Core Domain Maps**: User-facing application areas with complete functionality mapping
- **Infrastructure Maps**: Cross-cutting concerns referenced by core domains using `$ref`
- **Sub-Domain Directories**: Complex domains split into focused sub-domain map files
- **Mega-Feature Files**: Large isolated features extracted with `$ref` references

### 6.2. Refactoring Triggers (If Rules Were Missed)

**🚨 IMMEDIATE REFACTORING REQUIRED**: Any existing file exceeding 300 lines or 5 feature groups must be split immediately.

## 7. Discovery Tools & Analysis Methods

### 7.1. Recommended Tool Usage
- **Entry Point Discovery**: Use `glob` and `search_file_content` to find initial files
- **Recursive Analysis**: Use `read_file` and `read_many_files` extensively  
- **API Mapping**: Analyze server-side route handlers to populate `apiEndpoints`
- **Database Schema**: Analyze schema files and SQL migrations for `database` section

### 7.2. Analysis Constraints
1. **Domain Focus**: Only focus on one domain per system map
2. **Integration Gaps**: Document unintegrated code at end of system map
3. **Critical Misses**: Only modify other system maps if critical miss detected (explain why)

This guide is the definitive specification and must be followed without deviation to ensure system maps remain reliable and efficient tools for codebase analysis and modification.
