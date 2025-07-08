# Todo: Nutrition Inference from Chat

## Scope
- **Feature**: AI-powered nutrition tracking that automatically infers nutritional values from user conversations about food
- **Technical context**: Leverage existing AI chat system with vision capabilities to analyze food descriptions and photos, then automatically update health data with nutritional metrics

## Risk Assessment
- **Dependencies affected**: 
  - AI service (enhanced prompts)
  - Health data storage (new nutrition entries)
  - Chat processing pipeline (message analysis)
  - Memory system (food tracking patterns)
- **Potential conflicts**:
  - No conflicts with existing features
  - Enhances current nutrition coaching mode
  - Builds on existing health data infrastructure

## Tasks

### [ ] Task 1: Create Nutrition Inference Service
- **Problem**: Need a service to extract nutrition data from AI responses
- **Solution**: Create `server/services/nutrition-inference-service.ts`
  - Parse AI responses for nutrition information
  - Handle both explicit values (user provided) and inferred values (AI estimated)
  - Support various formats: "I ate 500 calories", "had a burger", "here's my lunch [photo]"
  - Return structured nutrition data object

### [ ] Task 2: Enhance AI Prompts for Nutrition Analysis
- **Problem**: AI needs specific instructions to analyze food and provide nutritional estimates
- **Solution**: Update `server/services/chat-context-service.ts`
  - Add nutrition analysis instructions to system prompts
  - Include guidance for photo analysis
  - Specify output format for easy parsing
  - Handle temporal context (today, yesterday, specific dates)

### [ ] Task 3: Create Message Post-Processing Pipeline
- **Problem**: Need to automatically process chat messages for nutrition data
- **Solution**: Add post-processing to chat routes
  - After AI response, analyze for nutrition content
  - Extract date context from conversation
  - Call nutrition inference service
  - Store data in health database

### [ ] Task 4: Implement Date Context Parser
- **Problem**: Users mention food at different times ("yesterday", "last Monday", "today")
- **Solution**: Create date parsing utility
  - Parse relative dates from conversation context
  - Convert to absolute timestamps
  - Handle timezone considerations
  - Default to current date if unspecified

### [ ] Task 5: Create Nutrition Data Storage Handler
- **Problem**: Need to store inferred nutrition data properly
- **Solution**: Extend health data storage
  - Use existing `createHealthData` with nutrition category
  - Store individual nutrients (calories, protein, carbs, fat)
  - Add metadata for source (chat inference)
  - Link to conversation ID for traceability

### [ ] Task 6: Add Memory Integration
- **Problem**: Should remember user's eating patterns and preferences
- **Solution**: Enhance memory system
  - Create food-specific memory categories
  - Track dietary restrictions, allergies
  - Remember typical meals and portions
  - Use memories to improve inference accuracy

### [ ] Task 7: Create Aggregation Logic
- **Problem**: Multiple food entries per day need aggregation
- **Solution**: Add daily nutrition summaries
  - Sum nutrition values by date
  - Handle meal-level granularity
  - Support updating existing entries
  - Provide daily totals in health data

### [ ] Task 8: Add Validation and Error Handling
- **Problem**: AI inference might be inaccurate or fail
- **Solution**: Implement safeguards
  - Validate nutritional ranges (e.g., calories 0-10000)
  - Handle parsing failures gracefully
  - Log inference confidence levels
  - Allow user corrections

### [ ] Task 9: Create Tests
- **Problem**: Complex feature needs comprehensive testing
- **Solution**: Write Vitest tests
  - Test nutrition extraction from various text formats
  - Test date parsing edge cases
  - Test data storage and aggregation
  - Test AI prompt effectiveness

### [ ] Task 10: Update System Maps
- **Problem**: New feature needs documentation
- **Solution**: Update system architecture maps
  - Add nutrition inference to chat domain
  - Document data flow
  - Update health data domain
  - Create feature-specific map

## Safety Checks
- [ ] HMR/WebSocket stability preserved - No changes to core infrastructure
- [ ] No unused code - All code integrated into chat pipeline
- [ ] No conflicts - Enhances existing features without breaking changes
- [ ] Production-ready - Includes error handling and validation

## Implementation Details

### Nutrition Data Structure
```typescript
interface NutritionData {
  calories?: number;
  protein?: number;  // grams
  carbs?: number;    // grams
  fat?: number;      // grams
  fiber?: number;    // grams
  sugar?: number;    // grams
  sodium?: number;   // mg
  timestamp: Date;
  confidence: 'high' | 'medium' | 'low';
  source: 'user_provided' | 'ai_inferred' | 'photo_analysis';
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}
```

### AI Prompt Enhancement Example
```
When users discuss food or meals:
1. Identify all food items mentioned
2. Analyze any food photos provided
3. Estimate nutritional values if not explicitly stated
4. Format response to include structured nutrition data
5. Consider portion sizes and cooking methods
6. Account for temporal context (when the meal was consumed)
```

### Integration Flow
1. User sends message about food (text/photo)
2. AI analyzes and responds with nutrition estimates
3. Post-processor extracts nutrition data
4. Date context is resolved
5. Data is stored in health database
6. Memory system updates food patterns
7. Dashboard reflects updated nutrition metrics

## Review
[To be filled after completion]