# ultra-think

**Wellness AI Strategic Thinking**: Deep analysis for complex features before planning phase.

## Purpose
Pre-planning brainstorming specifically for wellness AI app features, considering our unique architecture, constraints, and user needs.

## Wellness App Context Awareness

### Our Architectural Foundation
- **React + TypeScript + Vite** (frontend with strict ESM)
- **Node.js + Express + PostgreSQL + Drizzle ORM** (backend)
- **Go microservices** (file processing, memory operations)
- **Multi-AI provider system** (OpenAI GPT-4o, Google Gemini 2.0)
- **Replit constraints** (port mapping, HMR stability)

### Domain Boundaries (Respect Always)
- **health/** - Health data, reports, medical info, Apple Health integration
- **memory/** - ChatGPT-style memory, conversation state, deduplication  
- **chat/** - AI streaming interface, SSE, smooth typing simulation
- **settings/** - User preferences, AI model selection, coaching modes
- **file-manager/** - Upload, processing, Go service integration
- **home/** - Dashboard, landing page, user flows
- **auth/** - Authentication, session management

## Deep Problem Analysis Process

### 1. Wellness Context Mapping
- **User journey impact**: Which coaching modes affected? (weight-loss, muscle-gain, fitness, mental-wellness, nutrition)
- **Health data implications**: Will this process Apple Health XML, Google Fit JSON, or CDA XML?
- **Memory system effects**: How does this integrate with ChatGPT-style memory and deduplication?
- **AI provider considerations**: Which model(s) suit this feature? Context length needs?

### 2. Architectural Fit Assessment  
- **Domain placement**: Which domain does this naturally belong to?
- **Cross-domain needs**: Any legitimate shared concerns vs violations?
- **Component/service budget**: Current count vs 25 component / 20 service limits
- **Go service opportunities**: Any >5MB file processing or heavy computation?

### 3. Multi-Dimensional Solution Generation
Generate 5+ approaches considering:

**A. Pure Frontend Solution**
- React components + hooks + local state
- React Query for caching and server state
- Pros: Fast development, no backend changes
- Cons: Limited data processing, no persistence

**B. Node.js Backend Extension**  
- Express routes + Drizzle ORM
- Integration with existing AI providers
- Pros: Leverages existing infrastructure
- Cons: May hit Node.js performance limits

**C. Go Microservice Integration**
- New Go service or extend existing ones
- High-performance processing capabilities  
- Pros: Optimal for heavy computation/files
- Cons: Additional service complexity

**D. Hybrid Multi-Layer Approach**
- Frontend for UX + Node.js for API + Go for processing
- Leverages strengths of each layer
- Pros: Optimal performance and user experience
- Cons: Coordination complexity

**E. AI-First Native Solution**
- Leverage multi-AI provider system
- Streaming responses with memory integration
- Pros: Aligns with app's core strength
- Cons: Dependent on AI provider capabilities

### 4. Wellness-Specific Risk Assessment
- **User experience impact**: How does this affect coaching conversation flow?
- **Health data privacy**: Any PHI/sensitive health information concerns?
- **AI reliability**: Dependency on AI provider uptime and response quality?
- **Memory system integrity**: Risk of memory corruption or deduplication issues?
- **Performance at scale**: How does this handle multiple concurrent users?
- **Replit constraints**: HMR stability, WebSocket handling, port mapping issues?

### 5. Strategic Decision Framework
Consider these wellness app priorities:
1. **User health outcomes** - Does this improve coaching effectiveness?
2. **Conversation quality** - Does this enhance AI interactions?
3. **System reliability** - Maintains 24/7 availability for health tracking?
4. **Development velocity** - Can team ship this without architectural debt?
5. **Future flexibility** - Enables other wellness features?

## Output Format

```
# Wellness AI Deep Analysis: [Feature/Problem]

## User Impact & Wellness Context
- Coaching modes affected: [weight-loss/muscle-gain/fitness/mental-wellness/nutrition]
- Health data integration needs: [Apple Health/Google Fit/CDA XML/manual entry]
- Memory system implications: [conversation enhancement/new memory types/retrieval changes]

## Architectural Analysis
- **Primary domain**: [health/memory/chat/settings/file-manager/home/auth]
- **Cross-domain touchpoints**: [legitimate shared concerns listed]
- **Component budget impact**: [current count + new needs vs 25 limit]
- **Service budget impact**: [current count + new needs vs 20 limit]
- **Go service opportunity**: [Yes/No - if >5MB processing or heavy computation]

## Solution Approaches
1. **[Approach A - e.g., "Pure Frontend Enhancement"]**
   - Implementation: [Specific to our React+TypeScript+Vite setup]
   - Domain placement: [Which domain folder structure]
   - Pros: [Benefits in our architecture]
   - Cons: [Limitations with our constraints]
   - Effort: [Hours/Days estimate]

[... 4+ more approaches specific to our architecture ...]

## Recommended Strategy
**Winner: [Chosen Approach]**

### Why This Fits Our Wellness App
- Aligns with domain boundaries and architectural patterns
- Leverages existing [AI/memory/health data processing] infrastructure
- Maintains user experience standards for health coaching
- Respects Replit constraints and component/service limits

### Implementation Roadmap
1. **MVP (Ship in X days)**: Core functionality integrated into user flows
2. **Enhancement (Ship in Y days)**: Performance optimization and advanced features

### Wellness App Success Criteria
- User coaching experience improved or maintained
- Health data processing reliability preserved
- AI conversation quality enhanced
- System performance within acceptable bounds
- Architecture remains clean (0 cross-domain violations)

### Risk Mitigation for Our Stack
- **Replit stability**: [HMR/WebSocket handling preservation plan]
- **AI provider reliability**: [Fallback strategies for OpenAI/Google outages]
- **Memory system integrity**: [Deduplication and consistency preservation]
- **Health data privacy**: [PHI handling and security measures]
```

## Wellness App Specific Use Cases

### Complex Health Data Integration
- Multi-format parsing (Apple Health XML + Google Fit JSON)
- Real-time health metric streaming and AI analysis
- Cross-platform health data synchronization

### Advanced AI Coaching Features  
- Multi-modal coaching (text + health data + file uploads)
- Personalized wellness plan generation
- Progress tracking with predictive analytics

### Memory System Enhancements
- Health conversation context preservation
- Personalized coaching memory patterns
- Long-term wellness journey tracking

## Key Principles for Wellness AI

1. **Health-First Design**: Every feature should improve health outcomes
2. **Privacy by Design**: Health data security cannot be compromised
3. **Conversation Continuity**: Maintain coaching relationship context
4. **Incremental Value**: Each feature ships working wellness improvements
5. **Architecture Respect**: Domain boundaries protect feature isolation

## When to Use Ultra-Think

- Major wellness features (new coaching modes, health integrations)
- AI provider changes or new model integrations
- Memory system architectural changes
- Performance issues affecting user health tracking
- Complex multi-domain features requiring careful coordination

Use ultra-think when the solution approach isn't obvious and requires deep consideration of wellness app constraints, user health impact, and architectural fit.