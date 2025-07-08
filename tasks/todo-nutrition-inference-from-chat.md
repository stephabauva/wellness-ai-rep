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

### [X] Task 1: Create Nutrition Inference Service
- **Problem**: Need a service to extract nutrition data from AI responses
- **Solution**: Create `server/services/nutrition-inference-service.ts`
  - Parse AI responses for nutrition information
  - Handle both explicit values (user provided) and inferred values (AI estimated)
  - Support various formats: "I ate 500 calories", "had a burger", "here's my lunch [photo]"
  - Return structured nutrition data object

### [X] Task 2: Enhance AI Prompts for Nutrition Analysis
- **Problem**: AI needs specific instructions to analyze food and provide nutritional estimates
- **Solution**: Update `server/services/chat-context-service.ts`
  - Add nutrition analysis instructions to system prompts
  - Include guidance for photo analysis
  - Specify output format for easy parsing
  - Handle temporal context (today, yesterday, specific dates)

### [X] Task 3: Create Message Post-Processing Pipeline
- **Problem**: Need to automatically process chat messages for nutrition data
- **Solution**: Add post-processing to chat routes
  - After AI response, analyze for nutrition content
  - Extract date context from conversation
  - Call nutrition inference service
  - Store data in health database

### [x] Task 4: Implement Date Context Parser
- **Problem**: Users mention food at different times ("yesterday", "last Monday", "today")
- **Solution**: Create date parsing utility
  - Parse relative dates from conversation context
  - Convert to absolute timestamps
  - Handle timezone considerations
  - Default to current date if unspecified

### [X] Task 5: Create Nutrition Data Storage Handler
- **Problem**: Need to store inferred nutrition data properly
- **Solution**: Extend health data storage
  - Use existing `createHealthData` with nutrition category
  - Store individual nutrients (calories, protein, carbs, fat)
  - Add metadata for source (chat inference)
  - Link to conversation ID for traceability

### [X] Task 6: Add Memory Integration
- **Problem**: Should remember user's eating patterns and preferences
- **Solution**: Enhance memory system
  - Create food-specific memory categories
  - Track dietary restrictions, allergies
  - Remember typical meals and portions
  - Use memories to improve inference accuracy

### [x] Task 6.2: Update Memory UI to Display New Food Categories
- **Problem**: New food-related memory categories (food_preferences, dietary_restrictions, meal_patterns, nutrition_goals) are not visible in the memory UI
- **Solution**: Update MemorySection component
  - Add new category tabs for food-related memories
  - Update overview to include counts for new categories
  - Add appropriate category badges and descriptions
  - Ensure category filtering works for new categories
  - Add icons or visual indicators for food-related categories

### [ ] Task 6.3: Harmonize Memory Overview with Category Tabs
- **Problem**: Inconsistency between overview display (total memories, preferences, instruction, personal info) and category tabs (all, preferences, personal, context, instructions)
- **Solution**: Standardize memory categories across UI
  - Update overview to show all category types consistently
  - Include 'context' category in overview counts
  - Add new food-related categories to both overview and tabs
  - Ensure consistent naming (e.g., "instruction" vs "instructions")
  - Update API endpoint to return all category counts

### [ ] Task 6.4: Fix Real-time Memory Count Updates
- **Problem**: Memory counts in overview don't update in real-time after adding/deleting memories, requiring page refresh
- **Solution**: Implement proper cache invalidation
  - Ensure query:memories-overview is invalidated after memory operations
  - Update mutation callbacks to trigger overview refetch
  - Add optimistic updates for immediate UI feedback
  - Test count updates for all CRUD operations
  - Verify counts update for both individual and bulk operations

### [X] Task 7: Create Aggregation Logic
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
**Task 7 Implementation Complete ✅**

### What was implemented:
1. **NutritionAggregationService** - New service for daily nutrition aggregation
   - Daily nutrition summaries with meal-level granularity
   - Support for updating existing entries
   - Weekly averages calculation
   - Comprehensive caching with TTL

2. **Storage Integration** - Added aggregation methods to storage interface
   - `getDailyNutritionSummary` - Get daily totals with meal breakdown
   - `getNutritionSummariesByRange` - Get summaries for date ranges
   - `updateNutritionEntry` - Update existing nutrition entries
   - `getMealNutritionBreakdown` - Get meal-level breakdown
   - `getWeeklyNutritionAverages` - Weekly average calculations

3. **Cache Enhancement** - Added generic cache methods to cache service
   - `get<T>`, `set<T>`, `del`, `delPattern` methods
   - Automatic cache invalidation on data updates

4. **Comprehensive Testing** - Full test suite for aggregation logic
   - 10 test cases covering all aggregation scenarios
   - Mock integration testing
   - Edge case handling

### Key Features:
- **Meal-level granularity**: Tracks breakfast, lunch, dinner, snack separately
- **Daily totals**: Sums all nutrition components by date
- **Update support**: Can modify existing entries for specific dates/meals
- **Weekly averages**: Calculates averages excluding days with no data
- **Performance**: 1-hour cache TTL with smart invalidation
- **Type safety**: Full TypeScript integration with proper interfaces

### Files created/modified:
- ✅ `server/services/nutrition-aggregation-service.ts` - Main aggregation service
- ✅ `server/services/nutrition-aggregation-service.test.ts` - Comprehensive test suite
- ✅ `server/storage.ts` - Added aggregation methods to storage interface
- ✅ `server/services/cache-service.ts` - Added generic cache methods
- ✅ `.system-maps/json-system-maps/chat/nutrition-inference-service.map.json` - Updated system documentation

### Integration:
- Automatically invalidates cache when new nutrition data is created
- Seamlessly integrates with existing health data infrastructure
- Maintains backward compatibility with existing nutrition tracking
- Ready for frontend integration with health dashboard components