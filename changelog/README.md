
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

*   **[2025-01-08: Paperclip Button File Attachment Fix](./06-paperclip-attachment-fix-2025-01-08.md)**
    *   Critical fix for chat interface file attachment functionality. Files now properly attach as removable badges instead of text, enabling AI to receive file context for health documents and images.

*   **[2025-01-09: Automatic AI Model Selection](./07-ai-model-auto-selector-2025-01-09.md)**
    *   Implementation of intelligent automatic AI model selection system that chooses optimal models based on query type and attachments. Features context-aware detection, multi-provider support, fallback mechanisms, and user controls for enhanced AI performance.

*   **[2025-01-11: Chat Context Persistence & Conversation History](./08-chat-context-persistence-2025-01-11.md)**
    *   Complete implementation of ChatGPT-style conversation persistence with full visual context maintenance. Both OpenAI and Google Gemini models now maintain context across conversation turns, enabling follow-up questions about images and seamless multi-turn conversations with mixed content (text, images, files).

*   **[2025-01-12: First Message Visibility Issue Resolution](./09-first-message-visibility-issue-2025-01-12.md)**
    *   Critical bug fix for first message visibility in new conversations. Implemented a simplified pending message strategy using local React state instead of complex React Query cache transitions. Messages now appear immediately upon sending, providing seamless ChatGPT-like user experience with enhanced auto-scroll functionality.

*   **[2025-01-12: Attachment Persistence Issue Resolution](./10-attachment-persistence-issue-2025-01-12.md)**
    *   **✅ RESOLVED**: Critical fix for attachment persistence in conversations. Fixed React state closure issue where conversation IDs weren't properly maintained across message turns. Images and files now remain visible throughout entire conversations, enabling proper follow-up questions about visual content. Complete ChatGPT-like visual conversation experience restored.

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

5.  **Intelligent Model Optimization (Automatic AI Model Selection):**
    *   The **Automatic AI Model Selection** system (`server/services/openai-service.ts`) analyzes user queries and attachments to automatically choose the optimal AI model for each specific use case. This enhances the Multi-LLM support by intelligently routing simple text queries to fast models (Gemini 2.0 Flash), image analysis to vision-capable models (Gemini 1.5 Pro), and complex reasoning to advanced models. It works seamlessly with file attachments from the paperclip fix and integrates with user settings (`client/src/components/SettingsSection.tsx`) for manual override capabilities.

6.  **ChatGPT-Style Conversation Persistence (Chat Context Persistence):**
    *   The **Chat Context Persistence** system (`server/services/openai-service.ts`, conversation database in `shared/schema.ts`) provides complete conversation history maintenance including visual context. Users can now ask follow-up questions about images (e.g., "what are the yellow slices?") and receive accurate responses referencing previous visual content. This works for both OpenAI (using message history with `image_url`) and Google Gemini (using `startChat()` with `inlineData`), creating a seamless ChatGPT-like experience across all supported AI models.

7.  **Robust Conversation Management (Message Visibility & Attachment Persistence):**
    *   **Message Visibility Fix**: Resolved first message visibility issues in new conversations using simplified React state management.
    *   **Attachment Persistence**: Fixed critical React state closure issues that prevented proper conversation ID management. The system now maintains complete visual context across all conversation turns, allowing users to upload images and ask follow-up questions while keeping all attachments visible throughout the conversation.

**Key Component Interactions:**

*   **`ChatSection.tsx`** is a central hub, benefiting from:
    *   Multi-LLM choices with automatic model selection.
    *   Text input from the `AudioRecorder.tsx`.
    *   Context and personalization from the `memory-service.ts`.
    *   Insights derived from data in `HealthDataSection.tsx`.
    *   Intelligent model routing based on attachments and query complexity.
    *   Complete conversation history with visual context persistence.
    *   **Robust conversation management** with proper state handling and attachment persistence.
*   **`shared/schema.ts`** is critical, defining data structures for:
    *   User preferences (including LLM choice, transcription provider, automatic model selection).
    *   Health data.
    *   AI memory.
    *   Conversations and conversation messages with full persistence support.
*   **Backend Services** (`server/services/*`):
    *   `transcription-service.ts` processes audio.
    *   `openai-service.ts` handles LLM calls with intelligent model selection logic and conversation context persistence.
    *   `memory-service.ts` manages AI memory.
    *   These services are orchestrated via `server/routes.ts` with full conversation history support.
*   **`SettingsSection.tsx`** provides user controls for:
    *   AI provider and model selection.
    *   Automatic model selection toggle.
    *   Integration with all AI-powered features.

## Current System Status: ✅ **FULLY OPERATIONAL**

The AI Wellness Coach now provides a complete, ChatGPT-like conversational experience with:
- **Persistent Visual Context**: Images and attachments remain visible throughout conversations
- **Intelligent Model Selection**: Automatic optimization based on query complexity and content type
- **Robust State Management**: Proper conversation threading and message visibility
- **Multi-modal Interactions**: Text, voice, images, and files all work seamlessly together
- **Personalized Coaching**: AI memory system provides contextual, personalized responses
- **Cross-Platform Compatibility**: Works across all supported AI providers (OpenAI, Google Gemini)
