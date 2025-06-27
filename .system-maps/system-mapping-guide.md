# System Mapping Generation Guide for LLMs

## 1. Core Philosophy

The primary objective of a system map is to create a structured, queryable, and unambiguous representation of the application's architecture. This map serves as a "single source of truth" for understanding how different parts of the codebase connect, from user-facing features down to specific database tables.

This guide is not for human consumption; it is a technical instruction set for an LLM. The format must be adhered to precisely to ensure operational efficiency, minimize token cost, and maximize analytical accuracy. The chosen format is a federated set of JSON files, as this format's rigid structure is the most computationally efficient for an LLM to parse and reason about.

## 2. Architecture: Hybrid Federated Maps

To ensure scalability, maintainability, and token efficiency, the system map employs a hybrid, federated architecture. It is not a single monolithic file but a directory of files linked from a root manifest.

- **Root Map (`/.system-maps/root.map.json`):** The single source of truth. It acts as a manifest, pointing to the entry point for each major application domain.
- **Domain Maps (`*.map.json`):** The default unit of mapping. Each domain (e.g., `health`, `memory`) should have a primary map file.
- **Sub-Domain Directories:** When a domain becomes too complex, its `path` in the `root.map.json` can point to a directory instead of a single file. This directory should contain multiple, more focused sub-domain map files (e.g., `/.system-maps/chat/` could contain `chat-conversation.map.json` and `chat-history.map.json`). This is the preferred method for splitting large domains.
- **Mega-Feature Files (`*.feature.json`):** For exceptionally large and isolated features within a domain, a feature can be extracted into its own file and referenced from the parent domain map using a `$ref` key. This should be used sparingly.

This hybrid architecture allows for surgical context loading. An LLM can be instructed to load a single sub-domain map for a targeted fix, or it can load all maps in a domain's directory for a comprehensive understanding, providing the optimal balance between context and cost.

### 2.1. Refactoring Triggers

To maintain clarity and prevent maps from becoming unwieldy, the following quantitative triggers mandate refactoring a domain map:

-   **Split into Sub-Domain Directories when:**
    -   The total line count of a single `[domain].map.json` file exceeds **300 lines**.
    -   OR the number of top-level `featureGroups` in a single map exceeds **5**.
    -   **Action:** Create a directory (e.g., `/.system-maps/[domain]/`) and split the `featureGroups` into logical, smaller sub-domain map files within it (e.g., `[feature-group-A].map.json`, `[feature-group-B].map.json`). Update the `root.map.json` path to point to the new directory.

-   **Extract to a Mega-Feature File when:**
    -   The JSON definition for a *single feature* within a `featureGroup` exceeds **100 lines**.
    -   **Action:** Create a new `[feature-name].feature.json` file. Move the entire feature object into this new file. In the original domain map, replace the feature object with a `$ref` pointer (e.g., `"$ref": "./[feature-name].feature.json"`). This should be used only for individual features that are disproportionately large.

#### Metadata Requirements for Extracted Features

**MANDATORY:** All extracted `.feature.json` files MUST include a metadata header at the top of the file to provide context:

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
  // ... rest of feature definition
}
```

This metadata ensures that extracted features remain self-documenting and provide clear navigation context when viewed in isolation.

## 3. File Schema Definition

Adherence to the following JSON schema is mandatory.

**Table of Contents Requirement:** All system map files MUST include a `tableOfContents` object at the top of the file structure, except for `root.map.json`. The table of contents provides a quick overview of feature groups and their associated features, enabling efficient navigation and understanding of the map's structure.

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
    "[groupName]": ["feature-name-1", "feature-name-2", "feature-name-3"]
  },
  "lastUpdated": "String (ISO 8601 timestamp)",
  "dependencies": ["String (list of other domains)"],
  "featureGroups": {
    "[groupName]": {
      "description": "String: A summary of the feature group's purpose.",
      "features": {
        "[feature-name]": {
          "description": "...",
          "userFlow": ["..."],
          "components": ["..."],
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
