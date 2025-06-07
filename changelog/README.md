# AI Wellness Coach - Changelog Overview

This directory contains detailed changelogs for major feature releases of the AI Wellness Coach application. Each file documents a significant set of additions or enhancements.

## Feature Changelogs (Chronological)

*   **[2025-01-03: Initial Release & Core Features](./01-initial-release-2025-01-03.md)**
    *   Foundation of the AI Wellness Coach, including AI-powered coaching modes, smart device integration, health data management, PDF reports, and the initial tech stack.

*   **[2025-01-04: Multi-LLM Provider Support](./02-multi-llm-support-2025-01-04.md)**
    *   Introduction of user-selectable AI providers (OpenAI, Google Gemini) and model configuration.

*   **[2025-06-04: Advanced Audio-to-Text System](./03-advanced-audio-to-text-2025-06-04.md)**
    *   Implementation of a multi-provider transcription system (Web Speech API, OpenAI Whisper, Google Speech-to-Text) with smart selection, advanced recording capabilities, and UI integration.

*   **[2025-06-04: Comprehensive Health Data System](./04-comprehensive-health-data-2025-06-04.md)**
    *   Significant expansion of health data tracking with detailed categories, numerous metrics, UI enhancements for data display, and API improvements.

*   **[2025-06-04: ChatGPT-Style AI Memory System](./05-ai-memory-system-2025-06-04.md)**
    *   Addition of a sophisticated AI memory system for personalized and context-aware conversations, including smart memory detection, semantic retrieval, and user management interface. (See also: `../../ai-memory-system-implementation.md`)

## Feature Interconnections & Evolution

The AI Wellness Coach has evolved through several key stages, with features often building upon or interacting with each other:

1.  **Foundation (Initial Release):**
    *   Established the core coaching loop, data storage (`server/db.ts`, `shared/schema.ts`), basic chat (`client/src/components/ChatSection.tsx`), and device integration (`client/src/components/ConnectedDevicesSection.tsx`). PDF reporting (`client/src/lib/pdf-generator.ts`, `server/services/pdf-service.ts`) provided initial value from collected data.

2.  **Enhanced AI Core (Multi-LLM):**
    *   The ability to switch LLMs (`server/services/openai-service.ts`, potential new Google service, updates to user preferences in `shared/schema.ts`) provided flexibility and resilience to the AI coaching, directly impacting the `ChatSection`.

3.  **Improved Interaction & Data Input:**
    *   **Advanced Audio-to-Text:** This system (`client/src/components/AudioRecorder.tsx`, `client/src/services/audio-service.ts`, `server/services/transcription-service.ts`) dramatically enhances user interaction by allowing voice input into the chat, feeding transcribed text into the AI coaching dialogue. It integrates with the `ChatSection` and user settings.
    *   **Comprehensive Health Data:** This expanded the types and granularity of data (`shared/schema.ts`) the system can handle. This data, visualized in `client/src/components/HealthDataSection.tsx` and `HealthMetricsCard.tsx`, becomes richer input for the AI to provide more personalized and accurate coaching.

4.  **Smarter, Personalized Coaching (AI Memory):**
    *   The **AI Memory System** (`client/src/components/MemorySection.tsx`, `server/services/memory-service.ts`) leverages the chat interactions (potentially including those from audio-to-text) and user-provided information to build a persistent understanding of the user. This makes the AI's responses more contextual, personalized, and effective over time, directly enhancing the `ChatSection` and the overall coaching experience. It also interacts with the database (`shared/schema.ts` for memory tables).

**Key Component Interactions:**

*   **`ChatSection.tsx`** is a central hub, benefiting from:
    *   Multi-LLM choices.
    *   Text input from the `AudioRecorder.tsx`.
    *   Context and personalization from the `memory-service.ts`.
    *   Insights derived from data in `HealthDataSection.tsx`.
*   **`shared/schema.ts`** is critical, defining data structures for:
    *   User preferences (including LLM choice, transcription provider).
    *   Health data.
    *   AI memory.
    *   Conversations.
*   **Backend Services** (`server/services/*`):
    *   `transcription-service.ts` processes audio.
    *   `openai-service.ts` (and similar for Google) handles LLM calls.
    *   `memory-service.ts` manages AI memory.
    *   These services are orchestrated via `server/routes.ts`.
