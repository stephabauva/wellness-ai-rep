[Release] - 2025-01-04

Added - Multi-LLM Provider Support

AI Provider Selection: Users can now choose between OpenAI and Google Gemini AI providers
Model Configuration: Support for multiple models per provider:
OpenAI: GPT-4o, GPT-4o Mini
Google: Gemini 2.0 Flash, Gemini 1.5 Pro
Settings Integration: AI provider and model selection interface in user settings
Dynamic Model Loading: API endpoint to fetch available models for each provider
Real-time Switching: Chat responses use the selected AI provider without requiring restart

Enhanced

Chat System: Updated to send AI configuration with each message
User Settings: Extended schema to store AI provider preferences
API Routes: Modified message handling to support AI provider parameters
Backend Services: Comprehensive AI service supporting both OpenAI and Google Gemini

Technical Implementation

Added Google Generative AI SDK integration
Created unified ChatService class with provider abstraction
Implemented proper error handling for multiple AI providers
Added validation schemas for AI provider selection
Enhanced user preferences storage for AI configuration