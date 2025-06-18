# Phase 2: Core Logic & Services Porting Report

This document summarizes the outcomes of Phase 2, which focused on migrating essential business logic, utilities, types, context, and key services (API communication and Health Data synchronization) from the PWA to the new React Native (`wellness-coach-native`) application.

## 1. Shared Code Migration (Hooks, Utils, Types, Context)

*   **Files Copied:** A significant portion of shared JavaScript/TypeScript code was copied from the PWA's `client/src/` directory to the corresponding locations within `wellness-coach-native/src/`. This included:
    *   **20 Hooks** (e.g., `useUserSettings`, `useFileManagement`, `useChatActions`) into `wellness-coach-native/src/hooks/`. Web-specific hooks and test files were excluded.
    *   **3 Utility files** (`chatUtils.tsx`, `fileManagerUtils.ts`, `upload-progress.ts`) into `wellness-coach-native/src/utils/`.
    *   **1 Type file** (`fileManager.ts`) into `wellness-coach-native/src/types/`.
    *   **1 Context file** (`AppContext.tsx`) into `wellness-coach-native/src/context/`.

*   **Initial Adaptations & Flagging:**
    *   **Web-Specific APIs:** Instances of web-specific APIs (e.g., `navigator.share`, `window.location.origin`, `performance.memory`, `HTMLInputElement` events, `File` objects, `XMLHttpRequest`) were identified. `// TODO: RN-Adapt` comments were added, and in some cases, initial React Native equivalents (like `Share` API) were provisionally included.
    *   **Path Adjustments:** All internal project import paths were updated from PWA's alias-based paths (e.g., `@/hooks/...`) to relative paths (e.g., `../hooks/...`) suitable for the new project structure. The path to the `@shared/schema` directory was also updated with a TODO for potential aliasing.
    *   **JSX in Utilities:** `chatUtils.tsx` and `fileManagerUtils.ts`, which contained `lucide-react` JSX for icons, were flagged. The icons were temporarily replaced with text placeholders, and a TODO was added to migrate to `lucide-react-native`. Tailwind CSS classes in `fileManagerUtils.ts` were converted to React Native style objects.
    *   **External Dependencies:** Dependencies on PWA-specific libraries or complex services (e.g., for PDF generation, advanced file compression) were noted for future RN-specific implementation.

*   *(For a detailed list of files and specific initial changes, refer to the subtask report for Step 2.1: "Copy relevant business logic, utilities, types, and context from the PWA to the React Native project, and perform initial adaptations.")*

## 2. API Service Layer Porting & Refactoring

*   **`apiClient.ts` Enhancement:** The `wellness-coach-native/src/services/apiClient.ts` utility was significantly enhanced to provide a centralized and standardized way to interact with the backend. The following generic helper functions were added:
    *   `getFromApi<T>(endpoint: string, options?: RequestOptions): Promise<T>`
    *   `postToApi<T>(endpoint: string, body: any, options?: RequestOptions): Promise<T>`
    *   `putToApi<T>(endpoint: string, body: any, options?: RequestOptions): Promise<T>`
    *   `patchToApi<T>(endpoint: string, body: any, options?: RequestOptions): Promise<T>`
    *   `deleteFromApi<T>(endpoint: string, options?: RequestOptions): Promise<T>`
    *   `postFormDataToApi<T>(endpoint: string, formData: FormData, options?: RequestOptions): Promise<T>` (for file uploads)
    These functions handle base URL concatenation, default headers, JSON processing, and basic error/timeout management.

*   **Refactoring of Ported Code:** All ported hooks (11 hooks) and the `AppContext.tsx` file that previously used direct `fetch` calls or PWA-specific API utilities were refactored to utilize the new `apiClient.ts` methods. This standardizes API communication across the copied modules.

*   **Special Handling for `useStreamingChat.ts`:** The `useStreamingChat.ts` hook, which handles Server-Sent Events (SSE) for real-time chat messages, continues to use a direct `fetch` call (constructed with `API_CONFIG.baseUrl`). This is because the helper functions in `apiClient.ts` consume the response body (e.g., via `.json()`), which is incompatible with the persistent connection required for SSE streaming.

*   *(For a detailed list of refactored files and specific changes, refer to the subtask report for Step 2.2: "Ensure all ported business logic (hooks, services copied from PWA) uses the new apiClient.ts for backend communication...")*

## 3. Health Data Synchronization Service Porting

*   **`rnHealthService.ts` Creation:** A new service file, `wellness-coach-native/src/services/rnHealthService.ts`, was created to manage health data integration using the `react-native-health` library.

*   **Core Functionalities Implemented:**
    *   **Platform Abstraction:** The service uses `Platform.OS` to provide specific implementations for iOS (HealthKit) and Android (GoogleFit).
    *   **Initialization & Permissions (`initHealthService`):**
        *   Handles the initialization of `AppleHealthKit` and `GoogleFit`.
        *   Requests read permissions for a predefined set of common health data types (e.g., Steps, HeartRate, ActiveEnergyBurned, Weight, SleepAnalysis).
    *   **Data Querying (`fetchHealthData`):**
        *   Fetches health data samples for the authorized types within a given date range using methods from `react-native-health`.
        *   Performs initial inline transformation of the platform-specific data into a common `HealthDataPoint` interface (defined with fields like `dataType`, `value`, `unit`, `timestamp`, `source`).
    *   **Backend Synchronization (`syncHealthDataToBackend`, `performFullHealthSync`):**
        *   `syncHealthDataToBackend` sends the collected `HealthDataPoint` array to the `/api/health-data/native-sync` backend endpoint using the `postToApi` method from `apiClient.ts`.
        *   `performFullHealthSync` orchestrates the entire process: initialization, data fetching, and backend synchronization.

*   **Areas for Further Attention & Refinement:**
    *   **Data Type Coverage:** Expand `fetchHealthData` to query all health types for which permissions are requested.
    *   **Data Transformation:** Implement more comprehensive data transformation logic (similar to PWA's `processHealthKitResults` and `processGoogleFitResults`) to ensure data consistency, especially for complex types like sleep data and for aligning units/type names with backend expectations.
    *   **Google Fit Data Granularity:** Evaluate if daily aggregated data for Google Fit (e.g., steps, calories) is sufficient or if more granular intra-day data is required.
    *   **Idempotency:** Implement mechanisms to prevent duplicate data submissions to the backend.
    *   **Error Handling & UX:** Enhance error handling for permission denials and provide better user feedback.
    *   **Payload Verification:** Ensure the payload structure for `/api/health-data/native-sync` precisely matches backend requirements.

*   *(For a detailed breakdown of the `rnHealthService.ts` implementation, refer to the subtask report for Step 2.3: "Adapt the PWA's Capacitor-based health data synchronization logic to React Native using `react-native-health` and `apiClient.ts`.")*

This phase has successfully laid the groundwork for core application logic and service integrations within the React Native project, paving the way for UI development and further feature adaptation.## Phase 2: Core Logic & Services Porting Report

This document summarizes the outcomes of Phase 2, which focused on migrating essential business logic, utilities, types, context, and key services (API communication and Health Data synchronization) from the PWA to the new React Native (`wellness-coach-native`) application.

## 1. Shared Code Migration (Hooks, Utils, Types, Context)

*   **Files Copied:** A significant portion of shared JavaScript/TypeScript code was copied from the PWA's `client/src/` directory to the corresponding locations within `wellness-coach-native/src/`. This included:
    *   **20 Hooks** (e.g., `useUserSettings`, `useFileManagement`, `useChatActions`) into `wellness-coach-native/src/hooks/`. Web-specific hooks and test files were excluded.
    *   **3 Utility files** (`chatUtils.tsx`, `fileManagerUtils.ts`, `upload-progress.ts`) into `wellness-coach-native/src/utils/`.
    *   **1 Type file** (`fileManager.ts`) into `wellness-coach-native/src/types/`.
    *   **1 Context file** (`AppContext.tsx`) into `wellness-coach-native/src/context/`.

*   **Initial Adaptations & Flagging:**
    *   **Web-Specific APIs:** Instances of web-specific APIs (e.g., `navigator.share`, `window.location.origin`, `performance.memory`, `HTMLInputElement` events, `File` objects, `XMLHttpRequest`) were identified. `// TODO: RN-Adapt` comments were added, and in some cases, initial React Native equivalents (like `Share` API) were provisionally included.
    *   **Path Adjustments:** All internal project import paths were updated from PWA's alias-based paths (e.g., `@/hooks/...`) to relative paths (e.g., `../hooks/...`) suitable for the new project structure. The path to the `@shared/schema` directory was also updated with a TODO for potential aliasing.
    *   **JSX in Utilities:** `chatUtils.tsx` and `fileManagerUtils.ts`, which contained `lucide-react` JSX for icons, were flagged. The icons were temporarily replaced with text placeholders, and a TODO was added to migrate to `lucide-react-native`. Tailwind CSS classes in `fileManagerUtils.ts` were converted to React Native style objects.
    *   **External Dependencies:** Dependencies on PWA-specific libraries or complex services (e.g., for PDF generation, advanced file compression) were noted for future RN-specific implementation.

*   *(For a detailed list of files and specific initial changes, refer to the subtask report for Step 2.1: "Copy relevant business logic, utilities, types, and context from the PWA to the React Native project, and perform initial adaptations.")*

## 2. API Service Layer Porting & Refactoring

*   **`apiClient.ts` Enhancement:** The `wellness-coach-native/src/services/apiClient.ts` utility was significantly enhanced to provide a centralized and standardized way to interact with the backend. The following generic helper functions were added:
    *   `getFromApi<T>(endpoint: string, options?: RequestOptions): Promise<T>`
    *   `postToApi<T>(endpoint: string, body: any, options?: RequestOptions): Promise<T>`
    *   `putToApi<T>(endpoint: string, body: any, options?: RequestOptions): Promise<T>`
    *   `patchToApi<T>(endpoint: string, body: any, options?: RequestOptions): Promise<T>`
    *   `deleteFromApi<T>(endpoint: string, options?: RequestOptions): Promise<T>`
    *   `postFormDataToApi<T>(endpoint: string, formData: FormData, options?: RequestOptions): Promise<T>` (for file uploads)
    These functions handle base URL concatenation, default headers, JSON processing, and basic error/timeout management.

*   **Refactoring of Ported Code:** All ported hooks (11 hooks) and the `AppContext.tsx` file that previously used direct `fetch` calls or PWA-specific API utilities were refactored to utilize the new `apiClient.ts` methods. This standardizes API communication across the copied modules.

*   **Special Handling for `useStreamingChat.ts`:** The `useStreamingChat.ts` hook, which handles Server-Sent Events (SSE) for real-time chat messages, continues to use a direct `fetch` call (constructed with `API_CONFIG.baseUrl`). This is because the helper functions in `apiClient.ts` consume the response body (e.g., via `.json()`), which is incompatible with the persistent connection required for SSE streaming.

*   *(For a detailed list of refactored files and specific changes, refer to the subtask report for Step 2.2: "Ensure all ported business logic (hooks, services copied from PWA) uses the new apiClient.ts for backend communication...")*

## 3. Health Data Synchronization Service Porting

*   **`rnHealthService.ts` Creation:** A new service file, `wellness-coach-native/src/services/rnHealthService.ts`, was created to manage health data integration using the `react-native-health` library.

*   **Core Functionalities Implemented:**
    *   **Platform Abstraction:** The service uses `Platform.OS` to provide specific implementations for iOS (HealthKit) and Android (GoogleFit).
    *   **Initialization & Permissions (`initHealthService`):**
        *   Handles the initialization of `AppleHealthKit` and `GoogleFit`.
        *   Requests read permissions for a predefined set of common health data types (e.g., Steps, HeartRate, ActiveEnergyBurned, Weight, SleepAnalysis).
    *   **Data Querying (`fetchHealthData`):**
        *   Fetches health data samples for the authorized types within a given date range using methods from `react-native-health`.
        *   Performs initial inline transformation of the platform-specific data into a common `HealthDataPoint` interface (defined with fields like `dataType`, `value`, `unit`, `timestamp`, `source`).
    *   **Backend Synchronization (`syncHealthDataToBackend`, `performFullHealthSync`):**
        *   `syncHealthDataToBackend` sends the collected `HealthDataPoint` array to the `/api/health-data/native-sync` backend endpoint using the `postToApi` method from `apiClient.ts`.
        *   `performFullHealthSync` orchestrates the entire process: initialization, data fetching, and backend synchronization.

*   **Areas for Further Attention & Refinement:**
    *   **Data Type Coverage:** Expand `fetchHealthData` to query all health types for which permissions are requested.
    *   **Data Transformation:** Implement more comprehensive data transformation logic (similar to PWA's `processHealthKitResults` and `processGoogleFitResults`) to ensure data consistency, especially for complex types like sleep data and for aligning units/type names with backend expectations.
    *   **Google Fit Data Granularity:** Evaluate if daily aggregated data for Google Fit (e.g., steps, calories) is sufficient or if more granular intra-day data is required.
    *   **Idempotency:** Implement mechanisms to prevent duplicate data submissions to the backend.
    *   **Error Handling & UX:** Enhance error handling for permission denials and provide better user feedback.
    *   **Payload Verification:** Ensure the payload structure for `/api/health-data/native-sync` precisely matches backend requirements.

*   *(For a detailed breakdown of the `rnHealthService.ts` implementation, refer to the subtask report for Step 2.3: "Adapt the PWA's Capacitor-based health data synchronization logic to React Native using `react-native-health` and `apiClient.ts`.")*

This phase has successfully laid the groundwork for core application logic and service integrations within the React Native project, paving the way for UI development and further feature adaptation.
