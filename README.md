# AI Wellness Coach

An advanced AI-powered wellness coaching application with sophisticated multi-language support, comprehensive health tracking capabilities, and intelligent conversational AI features.

## ✅ Current System Status: FULLY OPERATIONAL

The application provides a complete ChatGPT-like conversational experience with all core features functioning optimally.

### Recent Critical Fixes (June 2025)
- **Message Display**: All conversation messages now persist correctly across sessions
- **Auto Model Selection**: Google Gemini automatically selected for image analysis
- **Audio Recording**: Microphone functionality restored and fully operational  
- **Image Compatibility**: Enhanced format support including AVIF with graceful handling

## 🚀 Key Features

### AI-Powered Coaching
- **Intelligent Model Selection**: Automatic AI provider switching based on content type
  - Google Gemini for image analysis and visual content
  - OpenAI for text-based conversations and complex reasoning
- **Conversational Memory**: Persistent context across sessions with semantic retrieval
- **Multi-Provider Support**: OpenAI GPT-4o and Google Gemini 1.5 Pro integration
- **Personalized Responses**: Context-aware coaching based on user history and preferences

### Multi-Modal Interaction
- **Voice Input**: Advanced audio-to-text with multiple transcription providers
  - Web Speech API (browser-based, offline capable)
  - OpenAI Whisper (high accuracy)
  - Google Speech-to-Text (fast processing)
- **Visual Analysis**: Support for multiple image formats (JPEG, PNG, WebP, AVIF)
- **File Attachments**: Comprehensive document support with visual previews
- **Smart Format Handling**: Automatic validation and provider-specific format optimization

### Health Data Management
- **Comprehensive Tracking**: Body composition, cardiovascular, lifestyle, and medical metrics
- **Device Integration**: Smart watch, scale, and fitness tracker connectivity
- **Visual Analytics**: Advanced charts and trend analysis
- **PDF Reporting**: Automated health summary generation

### Conversation Management
- **Persistent Context**: Visual content maintained across conversation turns
- **Cross-Session History**: Complete conversation threading and recall
- **Attachment Persistence**: Files and images remain accessible throughout discussions
- **Follow-up Questions**: Reference previous images and content naturally

### File Management & Retention
- **Intelligent Categorization**: Automatic classification into high/medium/low value categories
- **Customizable Retention**: User-defined retention periods for different file types
- **Automated Cleanup**: Background processing for expired content removal
- **Medical Document Preservation**: Indefinite retention for critical health files

### Mobile-First Design
- **Responsive Interface**: Optimized for desktop, tablet, and mobile devices
- **Native Sharing**: Web Share API integration with AirDrop and cross-platform support
- **QR Code Generation**: Universal file sharing across any devices
- **Touch-Optimized**: Mobile-friendly navigation and interaction patterns

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Tailwind CSS** with shadcn/ui for modern, responsive design
- **TanStack React Query** for efficient data fetching and caching
- **Wouter** for client-side routing
- **React Hook Form** with Zod validation for form management

### Backend
- **Express.js** with TypeScript for robust API development
- **PostgreSQL** with Drizzle ORM for advanced data management
- **Vector Database**: pgvector for semantic memory retrieval
- **File Upload**: Multer integration with intelligent MIME type detection
- **Session Management**: Secure user authentication and state persistence

### AI Integration
- **OpenAI API**: GPT-4o for text processing and complex reasoning
- **Google Gemini**: 1.5 Pro for advanced image analysis and multi-modal content
- **Embedding Generation**: Vector-based semantic search and context retrieval
- **Automatic Provider Selection**: Content-aware AI model routing

### Audio Processing
- **MediaRecorder API**: Cross-browser audio capture with format fallbacks
- **Web Speech API**: Real-time browser-based transcription
- **Cloud Transcription**: OpenAI Whisper and Google Speech-to-Text integration
- **Format Optimization**: Automatic audio format selection for maximum compatibility

## 📁 Project Structure

```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # Frontend service layers
│   │   ├── context/        # React context providers
│   │   └── utils/          # Utility functions
├── server/                 # Express.js backend
│   ├── services/           # Business logic services
│   ├── routes.ts           # API route definitions
│   └── db.ts              # Database configuration
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Drizzle database schema
├── changelog/             # Detailed feature documentation
└── uploads/               # File attachment storage
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- OpenAI API key (optional)
- Google Gemini API key (optional)

### Environment Setup
```bash
# Database connection
DATABASE_URL=postgresql://...

# AI Provider Keys (optional)
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key
```

### Installation & Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Database migrations
npm run db:push
```

## 🎯 Core Capabilities

### Intelligent Conversation Flow
1. **User Input**: Text, voice, images, or file uploads
2. **Content Analysis**: Automatic detection of content type and complexity
3. **Model Selection**: Optimal AI provider chosen based on requirements
4. **Context Integration**: Previous conversation history and visual content included
5. **Response Generation**: Personalized, context-aware coaching responses
6. **Memory Formation**: Important information extracted and stored for future reference

### Health Coaching Workflow
1. **Data Collection**: Health metrics, device readings, user-uploaded documents
2. **Visual Analysis**: Image-based food logging, exercise form assessment, medical document review
3. **Personalized Insights**: AI-generated recommendations based on individual data patterns
4. **Progress Tracking**: Long-term trend analysis and goal achievement monitoring
5. **Report Generation**: Automated PDF summaries for healthcare providers

### Privacy & Security
- **Local Data Storage**: Sensitive health information stored locally when possible
- **Selective Cloud Processing**: Only necessary data sent to AI providers
- **Automatic Cleanup**: Intelligent file retention with privacy-focused deletion
- **User Control**: Full transparency and control over data sharing preferences

## 📚 Documentation

Detailed feature documentation available in `/changelog/`:
- Implementation guides for each major feature
- Technical architecture decisions
- API integration examples
- Troubleshooting guides

## 🔧 Development Notes

### Code Architecture
- **Custom Hooks**: Modular state management (`useChatMessages`, `useFileManagement`)
- **Service Layer**: Clean separation between UI and business logic
- **Type Safety**: Comprehensive TypeScript coverage across frontend and backend
- **Error Handling**: Graceful fallbacks and user-friendly error messages

### Performance Optimizations
- **React Query Caching**: Efficient data fetching with automatic invalidation
- **Image Optimization**: Format-specific handling for optimal loading
- **Lazy Loading**: Components and routes loaded on demand
- **Memory Management**: Automatic cleanup of temporary files and cache entries

## 🤝 Contributing

The codebase follows modern development practices with comprehensive documentation, type safety, and modular architecture. All major features include detailed implementation guides in the changelog directory.

## 📄 License

This project represents a comprehensive implementation of an AI-powered wellness coaching platform with state-of-the-art conversational AI capabilities and robust health data management features.