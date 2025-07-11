# Todo: Memory Display Cleanup

## Context & Investigation
- Analyzed MemorySection.tsx (lines 743-812) showing current memory display implementation
- Memory cards display multiple redundant pieces of information:
  - Category badge (e.g., "Preferences") at line 758-760
  - Importance badge (e.g., "Medium") at line 761-763
  - Memory content at line 778
  - Labels (semantic tags like "workout") at lines 780-788
  - Keywords (extracted words) at lines 790-803
- System map indicates display hierarchy: Category → Labels → Keywords
- Dependencies: MemorySection is a cross-domain component used by both memory and chat domains

## Scope
- Clean up redundant display of category, labels, and keywords in memory cards
- Maintain functional filtering capabilities while reducing visual clutter
- Focus on lines 743-812 in MemorySection.tsx
- Technical context: React component with Tailwind CSS styling
- Affected domain: memory-ui (specifically memory-browsing feature)

## Risk Assessment
- Dependencies affected: No @used-by annotations found on MemorySection
- Potential cascade effects: Changes limited to visual display, filtering logic unchanged
- Cross-domain impacts: Both memory and chat domains use this component, but changes are purely visual
- WebSocket/HMR stability risks: None - only UI changes
- Database migration needs: None - no data model changes

## Implementation Strategy
- Remove redundant keyword display since labels already provide semantic meaning
- Keep category badge as primary identifier
- Show importance only when it's high (to reduce noise)
- Display labels more subtly to avoid redundancy with category
- Maintain all existing functionality and data structures

## Tasks
- [ ] Task 1: Simplify memory card display
   - Problem: Too many badges showing redundant information (category, labels, keywords)
   - Solution: Remove keyword badges, make labels more subtle, show importance only when high
   - Files affected: client/src/components/MemorySection.tsx (lines 790-803 for keywords, 761-763 for importance)

- [ ] Task 2: Improve label display
   - Problem: Labels are too prominent and redundant with category
   - Solution: Make label badges smaller and more subtle (change from bg-blue-100 to lighter styling)
   - Files affected: client/src/components/MemorySection.tsx (lines 782-786)

- [ ] Task 3: Optimize importance display
   - Problem: Showing importance for every memory adds clutter
   - Solution: Only show importance badge when importanceScore > 0.7 (high importance)
   - Files affected: client/src/components/MemorySection.tsx (lines 761-763)

## Safety Checks
- [ ] HMR/WebSocket stability preserved - no changes to data flow
- [ ] No unused code or fallbacks - removing display only
- [ ] No conflicts between components - isolated to MemorySection
- [ ] Production-ready - removing visual elements only
- [ ] System maps will be updated - memory-ui.map.json display hierarchy
- [ ] Dependency annotations added - none needed for visual changes

## Testing Plan
- Manual testing checklist:
  - [ ] Memory cards display with reduced clutter
  - [ ] Category badges still visible and functional
  - [ ] High importance memories show importance badge
  - [ ] Label filtering still works
  - [ ] Memory creation still works from chat
  - [ ] Bulk operations unaffected
- No unit tests needed for visual changes
- Performance impact: Positive - less DOM elements rendered

## Rollback Plan
If something breaks:
- Git revert the commit
- No dependencies to check (visual changes only)
- No data migrations to rollback

## Review
[To be filled after completion]
- What worked
- What didn't
- Lessons learned