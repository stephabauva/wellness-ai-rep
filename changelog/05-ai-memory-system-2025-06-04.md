[Release] - 2025-06-04

Added - ChatGPT-Style AI Memory System

(See `../../annexe-05-ai-memory-system-implementation.md` for a deep dive)

Smart Memory Detection: Automatic identification of important information during conversations
Explicit memory triggers: "remember this", "don't forget", "keep in mind"
AI-powered auto-detection using GPT-4o-mini for memory-worthy content analysis
Category classification: preferences, personal_info, context, instruction
Importance scoring (0.0-1.0) for memory prioritization
Semantic Memory Retrieval: Vector-based similarity search for contextual memory access
OpenAI embeddings generation for semantic understanding
Cosine similarity matching for relevant memory discovery
Multi-factor ranking combining similarity, importance, and access patterns
Real-time memory integration in AI responses
Memory Management Interface: Complete user control over stored memories
Memory overview dashboard with statistics and categorization
Filterable memory browsing by type (preferences, personal, context, instructions)
Memory cards displaying content, keywords, importance levels, usage analytics
Delete functionality with confirmation dialogs
Access tracking showing creation dates and usage frequency
Enhanced Conversation System: Memory-aware chat with persistent context
Conversation tracking with UUID-based session management
Memory usage indicators showing how many memories influenced each response
Cross-session context maintenance for continuous personalization
Automatic memory saving during natural conversations

Critical Context Fixes (June 2025)
Cross-Session Context Contamination: Fixed React Query cache race conditions preventing proper message persistence
Message Display Resolution: Implemented forced refetch with zero stale time to ensure all messages appear correctly
Cache Invalidation Timing: Enhanced useChatMessages.ts to resolve issues where only first 2 messages displayed
Context Persistence: All conversation messages and visual context now maintained properly across sessions
Database Schema Extensions

Memory Entries Table: Vector embeddings storage with semantic search capability
Memory Triggers Table: Tracking of explicit and automatic detection events
Memory Access Log: Analytics for usage patterns and relevance scoring
Conversations Table: Structured conversation management with metadata
Conversation Messages Table: Enhanced message storage with role-based organization
Navigation & UI Updates

Memory Section: New brain icon navigation in sidebar and mobile menu
Mobile Layout: Updated 5-column mobile navigation including memory access
Memory Cards: Rich UI components for memory visualization and management
Context Integration: Memory indicators throughout the coaching interface
Technical Implementation

Memory Service: Comprehensive backend service handling detection, storage, retrieval
Vector Operations: JSON-based vector storage with similarity calculations
Enhanced Chat Service: Memory processing integrated into AI conversation flow
API Endpoints: RESTful memory management and conversation history access
Error Handling: Robust JSON parsing and embedding validation