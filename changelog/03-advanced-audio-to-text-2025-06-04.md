[Release] - 2025-06-04

Added - Advanced Audio-to-Text System

Multi-Provider Transcription Support

Three Transcription Providers: Web Speech API (browser-based, offline capable), OpenAI Whisper (high accuracy), Google Speech-to-Text (fast processing)
Smart Provider Selection: User-configurable transcription provider in settings with real-time availability detection
Automatic Language Detection: All providers support automatic language detection for seamless multilingual support
Online/Offline Awareness: System automatically detects network status and adjusts provider availability accordingly
Advanced Audio Recording Capabilities

Cross-Browser MIME Type Compatibility: Automatic detection and fallback for supported audio formats (WebM, MP4, OGG, WAV)
Intelligent Format Selection: Dynamic MIME type detection with graceful fallbacks to ensure recording works on all browsers
Dual Recording Modes: Real-time transcription (Web Speech API) and file-based recording (OpenAI/Google)
High-Quality Audio Capture: MediaRecorder with optimized settings (48kHz, mono, noise suppression, echo cancellation)
Microphone Permission Management: Graceful permission handling with user-friendly prompts
Recording State Management: Visual feedback for recording, processing, and transcription states
Robust Error Handling: MediaRecorder initialization with fallback options and comprehensive error reporting
Comprehensive User Interface

AudioRecorder Component: Intelligent microphone button with provider-specific behavior and status indicators
Settings Integration: Transcription provider selection in user preferences with detailed descriptions
Real-time Feedback: Toast notifications for recording status, transcription completion, and error handling
Network Status Indicators: Visual cues for online/offline status and provider requirements
Backend Infrastructure

Audio Format Detection: Server-side MIME type and file extension detection for proper transcription API compatibility
Transcription Service: Unified backend service handling all three providers with proper error handling
Secure API Endpoints: Protected routes for OpenAI Whisper and Google Speech-to-Text transcription
File Upload Support: Multer integration for audio file handling with size limits and validation
Provider Capabilities API: Dynamic endpoint returning real-time provider availability and features
Format Conversion: Automatic filename and content-type matching for transcription API requirements
Technical Implementation

Enhanced Database Schema: Added transcriptionProvider field to user preferences
Service Layer Architecture: Modular audio service with provider abstraction and fallback handling
TypeScript Integration: Complete type safety across frontend and backend components
Error Handling: Comprehensive error states with user-friendly messages and recovery options