# Todo: Dual Embedding Model System (ada-002 + 3-small)

## Context & Investigation

**Current State Analysis:**
- Single model: `text-embedding-3-small` for all operations
- Cost: Higher due to using premium model for all use cases
- Location: `shared/services/memory/embedding-service.ts:34`
- Defense system status: ✅ All checks passed (minor pre-existing TS error)

**System Map References:**
- Memory domain system map needs creation/update after implementation
- No cross-domain impacts - isolated to memory embedding service

**Dependencies Identified:**
- `@used-by memory/deduplication-helpers` - Similarity calculations
- `@used-by memory/retrieval-service` - Context matching
- `@used-by memory/memory-service` - General embedding generation
- `@used-by server/routes/memory-routes` - Manual memory processing

## Scope

**Brief Description:** Implement dual embedding model support with intelligent selection based on use case

**Technical Context:** 
- Add support for both `text-embedding-ada-002` and `text-embedding-3-small`
- Start with ada-002 for cost-effective testing, upgrade to 3-small when quality needed
- Smart context-based automatic model selection

**Affected Domains/Features:**
- Memory domain only
- No UI changes required (transparent to users)
- Manual memory creation will use ada-002 (10x cost savings)
- Chat context retrieval maintains 3-small (quality critical)

## Risk Assessment

**Dependencies Affected:**
- Memory service embedding generation method signature change
- All embedding consumers remain compatible via default parameters

**Potential Cascade Effects:**
- LOW - Backward compatible implementation
- Existing embeddings remain valid
- No database schema changes

**Cross-Domain Impacts:**
- NONE - Changes isolated to memory domain

**WebSocket/HMR Stability Risks:**
- NONE - No frontend build or WebSocket changes

**Database Migration Needs:**
- OPTIONAL - Could add model_version column to track which embeddings use which model
- NOT REQUIRED for MVP - embeddings work regardless of model used to generate them

## Implementation Strategy

**Approach Selection Rationale:**
- **Smart Context-Based Selection** chosen for optimal cost/quality balance
- Automatic model selection removes complexity from API consumers
- Clear use case mapping makes behavior predictable
- Progressive enhancement path from simple to sophisticated

**Why This Approach Over Alternatives:**
- Better than quality escalation: Predictable costs
- Better than user control: No UI complexity
- Better than A/B testing: Faster to implement
- Better than migration: No existing data changes needed

**Integration Points:**
- `EmbeddingService.generateEmbedding()` - Add model parameter
- `memory-service` factory - Configure use case mappings
- Cost tracking via logging for analysis

## Tasks

### Task 1: Enhance EmbeddingService for Dual Model Support
- **Problem:** Currently hardcoded to text-embedding-3-small only
- **Solution:** Add model parameter and selection logic
- **Files Affected:**
  - `shared/services/memory/embedding-service.ts:15-50` - Add model selection
  - `shared/services/memory/memory-types.ts` - Add EmbeddingModel enum

### Task 2: Implement Use Case Model Mapping
- **Problem:** Need clear rules for when to use each model
- **Solution:** Create use case enum with model assignments
- **Files Affected:**
  - `shared/services/memory/embedding-config.ts` (new file) - Use case mappings
  - `shared/services/memory/service-factory.ts` - Configure mappings

### Task 3: Update Manual Memory Route for ada-002
- **Problem:** Manual memories don't need expensive embeddings
- **Solution:** Pass use case context to embedding service
- **Files Affected:**
  - `server/routes/memory-routes.ts:190-210` - Add embedding use case
  - `shared/services/memory/deduplication-helpers.ts:60-65` - Accept model hint

### Task 4: Add Cost Tracking and Logging
- **Problem:** Need visibility into cost savings
- **Solution:** Log model usage with cost estimates
- **Files Affected:**
  - `shared/services/memory/embedding-service.ts:40-45` - Add cost logging
  - `shared/services/logger-service.ts` - Add embedding cost category

### Task 5: Maintain Backward Compatibility
- **Problem:** Existing code expects single model behavior
- **Solution:** Default to 3-small when use case not specified
- **Files Affected:**
  - All existing embedding calls remain unchanged
  - Optional migration path for specific use cases

## Safety Checks
- [x] HMR/WebSocket stability preserved - No frontend changes
- [x] No unused code or fallbacks - Enhancing existing service
- [x] No conflicts between components - Isolated to memory domain
- [ ] Production-ready - Will add proper error handling, remove console.logs
- [ ] System maps will be updated - After implementation
- [ ] Dependency annotations added - Will add @used-by comments

## Testing Plan

**Unit Tests Needed:**
- EmbeddingService with model selection
- Use case to model mapping logic
- Cost calculation accuracy
- Backward compatibility with no model specified

**Integration Tests Required:**
- Manual memory creation uses ada-002
- Chat retrieval uses 3-small
- Embedding quality comparison between models
- Performance benchmarks for both models

**Manual Testing Checklist:**
- [ ] Create manual memory, verify ada-002 used (check logs)
- [ ] Chat conversation, verify 3-small used for retrieval
- [ ] Compare duplicate detection accuracy between models
- [ ] Monitor cost reduction in logs
- [ ] Verify no regression in existing functionality

**Performance Impact Verification:**
- Measure embedding generation time for both models
- Compare memory usage and API latency
- Validate cost savings match expectations (10x for ada-002)

## Rollback Plan

If something breaks:
1. **Immediate:** Change DEFAULT_MODEL constant back to 'text-embedding-3-small'
2. **Model selection issues:** Remove use case logic, always use 3-small
3. **Dependencies to check:** 
   - Memory routes still creating memories
   - Duplicate detection still working
   - Chat retrieval maintaining quality
4. **Clean revert:** Git revert the commit, no database changes needed

## Implementation Order

1. **Phase 1 (Day 1):** Basic dual model support
   - Enhance EmbeddingService
   - Add model enums and types
   - Implement backward compatibility

2. **Phase 2 (Day 2):** Use case integration
   - Create use case mappings
   - Update manual memory route
   - Add cost tracking

3. **Phase 3 (Day 3):** Testing and optimization
   - Comprehensive testing
   - Performance benchmarking
   - Documentation updates

## Success Metrics

- **Cost Reduction:** 60%+ on manual memory embeddings
- **Quality Maintained:** No degradation in chat retrieval relevance
- **Performance:** <100ms overhead for model selection
- **Compatibility:** 100% backward compatible, zero breaking changes

## Future Enhancements

After successful implementation:
1. **Model Version Tracking:** Add database column for model used
2. **Bulk Migration Tools:** Re-embed old memories with ada-002 where appropriate
3. **Admin Dashboard:** Show embedding costs and model usage statistics
4. **Dynamic Thresholds:** Adjust similarity thresholds per model
5. **More Models:** Easy to add Claude, Cohere, or other embedding models

## Review
[To be filled after completion]
- What worked
- What didn't
- Lessons learned
- Actual cost savings achieved