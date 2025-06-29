# System Mapping Generation Guide for LLMs

## 1. Core Philosophy

The primary objective of a system map is to create a structured, queryable, and unambiguous representation of the application's architecture. This map serves as a "single source of truth" for understanding how different parts of the codebase connect, from user-facing features down to specific database tables.

This guide is not for human consumption; it is a technical instruction set for an LLM. The format must be adhered to precisely to ensure operational efficiency, minimize token cost, and maximize analytical accuracy. The chosen format is a federated set of JSON files, as this format's rigid structure is the most computationally efficient for an LLM to parse and reason about.

## 2. Architecture: Hybrid Federated Maps

To ensure scalability, maintainability, and token efficiency, the system map employs a hybrid, federated architecture. It is not a single monolithic file but a directory of files linked from a root manifest.

### 2.1. Core Architecture Components

- **Root Map (`/.system-maps/root.map.json`):** The single source of truth. It acts as a manifest, pointing to the entry point for each major application domain.
- **Core Domain Maps (`*.map.json`):** The primary unit of mapping representing user-facing application areas: `chat`, `health`, `file-manager`, `settings`, `connected-devices`, `memory`.
- **Infrastructure Maps (`/.system-maps/infrastructure/`):** Cross-cutting concerns like `logging.map.json`, `performance.map.json`, `testing.map.json` that are referenced by core domains using `$ref` patterns.
- **Sub-Domain Directories:** When a domain becomes too complex, its `path` in the `root.map.json` can point to a directory instead of a single file. This directory should contain multiple, more focused sub-domain map files.
- **Mega-Feature Files (`*.feature.json`):** For exceptionally large and isolated features within a domain, a feature can be extracted into its own file and referenced from the parent domain map using a `$ref` key.

### 2.1. Domain Scope Definition

**Core Domains** represent user-facing application areas and should contain all related functionality:
- Business logic, UI components, API endpoints, database operations
- Cross-cutting infrastructure concerns via `$ref` to infrastructure maps
- Domain-specific implementations of logging, performance, and testing

**Infrastructure Domains** handle cross-cutting concerns:
- Should be referenced by core domains, not standalone
- Contain reusable patterns and shared infrastructure code
- Examples: structured logging patterns, performance optimization hooks, testing utilities

### 2.2. Integration Status Validation Requirements

**MANDATORY**: Integration status cannot be marked as "active" without validation evidence. All features must include:

1. **Component-to-API Call Tracing**: Document actual `fetch()`, `queryKey`, and API calls in component code
2. **Endpoint Verification**: Validate that component calls match server route implementations
3. **Integration Testing Evidence**: Proof that the feature works end-to-end

**Integration Status Levels**:
- `active`: Feature is implemented, tested, and working end-to-end
- `partial`: Feature is implemented but has known gaps or incomplete functionality
- `planned`: Feature is designed but not yet implemented
- `broken`: Feature exists but fails during execution

### 2.1. File Size Creation Rules (MANDATORY ENFORCEMENT)

To maintain clarity and prevent maps from becoming unwieldy, the following quantitative rules **MUST BE FOLLOWED DURING CREATION**:

-   **🚨 MANDATORY CREATION RULE: Sub-Domain Directory Structure Required when:**
    -   A domain analysis indicates it would require more than **300 lines** in a single file.
    -   OR the domain would contain more than **5** top-level `featureGroups`.
    -   **PROACTIVE ACTION REQUIRED:** Estimate the domain size before creation. If it exceeds limits, immediately create a directory structure (e.g., `/.system-maps/[domain]/`) and split the `featureGroups` into logical, smaller sub-domain map files within it (e.g., `[feature-group-A].map.json`, `[feature-group-B].map.json`). Update the `root.map.json` path to point to the new directory.
    -   **PLANNING PRINCIPLE:** Choose the directory structure approach from the outset rather than creating oversized files that require refactoring.

-   **🚨 MANDATORY CREATION RULE: Mega-Feature File Required when:**
    -   A single feature analysis indicates it would exceed **100 lines** in JSON definition.
    -   **PROACTIVE ACTION REQUIRED:** Create a new `[feature-name].feature.json` file immediately. Move the entire feature object into this new file. In the parent domain map, reference it with a `$ref` pointer (e.g., `"$ref": "./[feature-name].feature.json"`).

### 2.2. Refactoring Triggers (If Rules Were Missed)

If existing files violate the creation rules above:

-   **🚨 IMMEDIATE REFACTORING REQUIRED:** Any existing file exceeding 300 lines or 5 feature groups must be split immediately.
-   **VIOLATION CONSEQUENCE:** System Map Auditor will flag this as a critical error and block validation until resolved.

**CRITICAL PRINCIPLE:** Proactive structure planning prevents oversized files entirely. Always estimate and plan the appropriate structure before creating system maps.

#### Metadata Requirements for Extracted Features

**MANDATORY:** All extracted `.feature.json` files MUST include a metadata header and core references:

```json
{
  "_metadata": {
    "featureName": "health-data-import",
    "featureGroup": "data-operations", 
    "parentFile": "./dashboard.map.json",
    "domain": "health"
  },
  "description": "...",
  "userFlow": ["..."],
  "systemFlow": ["..."],
  "components": {
    "$ref": "../dashboard.map.json#/components"
  },
  "apiEndpoints": {
    "$ref": "../dashboard.map.json#/apiEndpoints"
  }
}
```

**CONDITIONAL:** Infrastructure references should only be included if the feature actually uses them:

```json
{
  // ... required fields above ...

  // Only include if feature implements structured logging
  "logging": {
    "$ref": "/.system-maps/infrastructure/logging.map.json#/health-logging"
  },

  // Only include if feature has performance monitoring hooks
  "performance": {
    "$ref": "/.system-maps/infrastructure/performance.map.json#/health-performance"
  },

  // Only include if feature has dedicated test infrastructure
  "testing": {
    "$ref": "/.system-maps/infrastructure/testing.map.json#/health-testing"
  }
}
```

This approach reduces token consumption and maintains accuracy by eliminating unused references while ensuring extracted features remain self-documenting.

## 3. File Schema Definition

Adherence to the following JSON schema is mandatory.

**Table of Contents Requirement:** All system map files MUST include a `tableOfContents` object at the top of the file structure, except for `root.map.json`. The table of contents provides a quick overview of feature groups, their associated features, components, and API endpoints, enabling efficient navigation and understanding of the map's structure.

**Dependency Validation:** Dependencies listed in domain maps must reflect actual code relationships. If domain A depends on domain B, the codebase should show imports, API calls, or other integration points between them. This ensures architectural accuracy and prevents documentation drift.

### 3.1. `root.map.json` (Hybrid Federated)

The root map is the only file that does NOT require a table of contents, as it serves as the master navigation index.

```json
{
  "appName": "String",
  "version": "String",
  "lastUpdated": "String (ISO 8601 timestamp, e.g., '2025-06-26T10:00:00Z')",
  "domains": {
    "[domainName]": {
      "description": "String: A summary of the domain's purpose.",
      "path": "String (relative path to the domain's entry point, can be a file OR a directory)",
      "dependencies": ["String: An array of other domain keys that this domain depends on."]
    }
  }
}
```

### 3.2. Domain Map (e.g., `health.map.json`)

A domain map can contain `featureGroups` and a reference to a mega-feature file.

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
      "description": "String: A summary of the feature group's purpose.",
      "features": {
        "[feature-name]": {
          "description": "...",
          "userFlow": ["Step 1: User clicks send button", "Step 2: User sees loading indicator"],
          "systemFlow": ["Validate message content", "Store in database via POST /api/chat", "Trigger AI processing", "Stream response"],
          "components": ["..."],
          "apiIntegration": {
            "expectedEndpoints": ["PATCH /api/health-consent/visibility"],
            "actualEndpoints": ["PATCH /api/health-consent"],
            "integrationGaps": ["visibility endpoint missing"]
          },
          "logging": {
            "$ref": "/.system-maps/infrastructure/logging.map.json#/chat-logging"
          },
          "performance": {
            "$ref": "/.system-maps/infrastructure/performance.map.json#/chat-performance"
          },
          "tests": ["String (path to test file, e.g., 'client/src/tests/chat/AttachmentDisplay.test.tsx')"]
        },
        "special-feature": {
            "description": "A very large feature, defined externally.",
            "$ref": "./special-feature.feature.json"
        }
      }
    }
  },
  "components": { "...": "..." },
  "apiEndpoints": { "...": "..." },
  "database": { "...": "..." }
}
```

## 4. Process for Map Generation

1.  **Initialization:** If it does not exist, create the `/.system-maps/` directory.
2.  **Root Map First:** Always begin by creating or updating `/.system-maps/root.map.json`. This provides the foundational context of the application's domains.
3.  **Domain-Driven Creation:** Create domain maps on a per-task basis. When a user requests work within a specific domain (e.g., "fix chat bug"), first load the corresponding domain map (`chat.map.json`). If it doesn't exist, create it by analyzing the relevant codebase sections.
4.  **Analysis Workflow (MANDATORY):** To populate a map, a deep and thorough analysis is required to avoid missing features of specific domain. A superficial file search is insufficient. The goal is to create a *complete* representation of the domain's functionality.
    - **Start with Entry Points:** Identify the primary UI components or server routes for the domain (e.g., `ChatSection.tsx` for the chat domain).
    - **Recursive Dependency Analysis:** This is the most critical step.
        - Read the entry point file(s).
        - Meticulously analyze all `import` statements to identify dependencies (hooks, components, services, utilities).
        - **Recursively read and analyze each discovered dependency.** This process must continue until all related files that contribute to the user-facing features have been mapped. For example, analyzing `ChatInputArea.tsx` should lead to discovering `useAudioRecording` and its related API calls.
    - **Trace the Full Flow:** For each feature, trace its execution path from the initial UI interaction (e.g., a button click) through all client-side logic (hooks, state management) to the API endpoint.
    - **Map API to Database:** From the API endpoint, trace the flow through any services to the database, noting which tables are read from (`readsFrom`) or written to (`modifies`).
    - **Use Tools for Discovery:**
        - Use `glob` and `search_file_content` to find initial entry points and related files, but do not rely on this exclusively.
        - Use `read_file` and `read_many_files` extensively during the recursive dependency analysis.
        - Analyze server-side route handlers to populate `apiEndpoints`.
        - Analyze schema files (`schema.ts`, SQL migrations) to populate the `database` section.

CAREFUL : 
1-Only focus on one domain for the system map, you should not modify other system maps or information of other features, unless you have detected a critical miss while browsing the code, in that case you must explain why. 
2-If some code related to the domain are not integrated, mention them at the end of the corresponding system map or in a separate file.

This guide is the definitive specification. It must be followed without deviation to ensure the system map remains a reliable and efficient tool for codebase analysis and modification.