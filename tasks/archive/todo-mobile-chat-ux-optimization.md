# Todo: Mobile Chat UX Optimization

## Context & Investigation
- Analyzed current chat implementation in `client/src/components/chat/`
- Identified friction points: input overload, missing gestures, poor thumb zone usage
- Reviewed mobile-specific CSS in `client/src/styles/mobile-theme-optimizations.css`
- Found unused `useSwipe` hook ready for gesture implementation
- System maps checked: `chat-domain.map.json`, `shared-ui-components.map.json`

## Scope
- Transform chat interface to be mobile-first with reduced friction
- Implement progressive disclosure for input methods
- Add gesture support for common actions
- Optimize for wellness-specific interactions (voice-first health logging)
- Enhance performance with haptic feedback and better animations

## Risk Assessment
- **ChatSection.tsx** used by main chat route - high traffic component
- **MessageDisplayArea.tsx** has virtual scrolling - must preserve performance
- **ChatInputArea.tsx** handles multiple input types - needs careful refactoring
- WebSocket connections for streaming - must not disrupt real-time features
- Cross-domain impact: None (isolated to chat domain)
- Database: No schema changes required

## Implementation Strategy
- **Phase 1**: Non-breaking enhancements (haptics, touch targets)
- **Phase 2**: Progressive input UI (backwards compatible)
- **Phase 3**: Gesture integration (additive features)
- **Phase 4**: Wellness-specific optimizations
- Rationale: Gradual rollout minimizes risk, allows A/B testing

## Tasks

### Phase 0: Layout Foundation (Week 1 - Critical)
- [ ] Task 0.1: Restructure visual hierarchy for thumb zone optimization
   - Problem: Header at top takes premium thumb-reachable space
   - Solution: Move to bottom-up layout with floating mini-header
   - Files affected:
     - `client/src/components/ChatSection.tsx:78-98` (restructure layout)
     - New: Floating header overlay only shows on scroll up
     - Primary actions move to thumb zone (bottom 2/3 of screen)

- [ ] Task 0.2: Implement mobile-first spacing system
   - Problem: Desktop padding/margins not optimized for mobile touch
   - Solution: Create mobile-specific spacing scale based on thumb reach zones
   - Files affected:
     - `client/src/styles/mobile-spacing.css` (new)
     - `client/src/components/ChatSection.tsx:63` (apply mobile container classes)
     - Update: 16px+ between touch targets, 24px+ for critical actions

- [ ] Task 0.3: Add thumb zone heat map visualization (dev only)
   - Problem: No visual guide for optimal touch target placement
   - Solution: Overlay showing easy/medium/hard reach zones
   - Files affected:
     - `client/src/dev-tools/ThumbZoneOverlay.tsx` (new, dev mode only)
     - Visual guide: Green (easy), Yellow (medium), Red (avoid)

### Phase 1: Quick Wins (Week 1)
- [ ] Task 1: Add haptic feedback system
   - Problem: No tactile feedback on interactions
   - Solution: Create `useHapticFeedback` hook in shared/hooks
   - Files affected:
     - `client/src/shared/hooks/useHapticFeedback.ts` (new)
     - `client/src/components/chat/ChatInputArea.tsx:45-60` (button handlers)
     - `client/src/components/chat/ChatMessage.tsx:120-130` (long press)

- [ ] Task 2: Increase touch targets to 44px minimum
   - Problem: Current buttons/inputs below iOS HIG standards
   - Solution: Update Tailwind classes and add touch-target utility
   - Files affected:
     - `client/src/components/chat/ChatInputArea.tsx:150-200` (all buttons)
     - `client/src/styles/mobile-theme-optimizations.css` (new utility class)

- [ ] Task 3: Add floating "scroll to bottom" button
   - Problem: Users lose position, miss new messages
   - Solution: Floating button with unread count indicator
   - Files affected:
     - `client/src/components/chat/MessageDisplayArea.tsx:250-300` (add button)
     - `client/src/components/chat/ChatSection.tsx:80-90` (track unread state)

### Phase 2: Progressive Input (Week 1-2)
- [ ] Task 4: Create ProgressiveChatInput component with layout optimization
   - Problem: All input options visible, causing choice paralysis + poor spacing
   - Solution: Compact/expanded modes with thumb-zone optimized layout
   - Files affected:
     - `client/src/components/chat/ProgressiveChatInput.tsx` (new)
     - `client/src/components/chat/ChatSection.tsx:115-120` (replace ChatInputArea)
     - `client/src/components/chat/hooks/useConversationContext.ts` (new)
   - Layout specifics:
     - Compact: Single line with rounded input, 56px height for easy thumb reach
     - Primary action (send/voice) at bottom-right (right-handed optimization)
     - Secondary actions accessible via swipe-up gesture

- [ ] Task 5: Implement input mode detection
   - Problem: No smart defaulting based on conversation type
   - Solution: Analyze conversation context, default to appropriate input
   - Files affected:
     - `client/src/components/chat/hooks/useInputModeDetection.ts` (new)
     - `client/src/components/chat/ProgressiveChatInput.tsx:30-50` (integrate)

### Phase 3: Gesture Support (Week 2)
- [ ] Task 6: Integrate swipe gestures for messages
   - Problem: No quick actions on messages
   - Solution: Use existing useSwipe hook for swipe-to-reply/delete
   - Files affected:
     - `client/src/components/chat/SwipeableMessage.tsx` (new wrapper)
     - `client/src/components/chat/MessageDisplayArea.tsx:180-200` (wrap messages)
     - `client/src/shared/hooks/useSwipe.ts` (verify compatibility)

- [ ] Task 7: Add bottom sheet for conversations
   - Problem: Switching conversations requires navigation away
   - Solution: Swipe-up bottom sheet with conversation list
   - Files affected:
     - `client/src/components/chat/ConversationBottomSheet.tsx` (new)
     - `client/src/components/chat/ChatSection.tsx:200-210` (add sheet)
     - `client/src/shared/components/BottomSheet.tsx` (create if needed)

- [ ] Task 8: Implement pull-to-refresh
   - Problem: No easy way to check for new messages
   - Solution: Pull down gesture to refresh conversation
   - Files affected:
     - `client/src/components/chat/MessageDisplayArea.tsx:100-150` (add pull logic)
     - `client/src/shared/hooks/usePullToRefresh.ts` (new)

### Phase 4: Wellness Optimizations (Week 3)
- [ ] Task 9: Add wellness quick action FAB
   - Problem: Health logging requires typing
   - Solution: Floating button with quick health entry options
   - Files affected:
     - `client/src/components/chat/WellnessQuickAction.tsx` (new)
     - `client/src/components/chat/ChatSection.tsx:220-230` (add FAB)
     - `client/src/components/health/QuickHealthEntry.tsx` (new modal)

- [ ] Task 10: Voice-first health input
   - Problem: Text input friction for symptom description
   - Solution: Auto-switch to voice for health conversations
   - Files affected:
     - `client/src/components/chat/ProgressiveChatInput.tsx:80-100` (voice priority)
     - `client/src/components/chat/VoiceTranscription.tsx` (enhance existing)

- [ ] Task 11: Add smart reply suggestions
   - Problem: Repetitive health responses require typing
   - Solution: Context-aware quick replies for common health queries
   - Files affected:
     - `client/src/components/chat/QuickReplies.tsx` (new)
     - `client/src/components/chat/ChatSection.tsx:180-190` (add replies)
     - `client/src/services/smartReplyService.ts` (new AI service)

## Safety Checks
- [ ] HMR/WebSocket stability preserved (no changes to connection logic)
- [ ] No unused code or fallbacks (remove old ChatInputArea after migration)
- [ ] No conflicts between components (progressive enhancement approach)
- [ ] Production-ready (haptic feedback degrades gracefully)
- [ ] System maps will be updated (chat-domain.map.json)
- [ ] Dependency annotations added (@used-by comments)

## Testing Plan
- **Unit tests**:
  - useHapticFeedback hook
  - Input mode detection logic
  - Swipe gesture thresholds
- **Integration tests**:
  - Progressive input state transitions
  - Message swipe actions
  - Bottom sheet interactions
- **Manual testing**:
  - One-thumb navigation test
  - Voice input in health context
  - Gesture responsiveness
  - Performance on low-end devices
- **Performance verification**:
  - 60fps animations
  - Bundle size increase <50KB
  - Memory usage with gestures

## Rollback Plan
If something breaks:
1. **Phase 1 issues**: Remove haptic calls, revert CSS changes
2. **Phase 2 issues**: Switch back to original ChatInputArea via feature flag
3. **Phase 3 issues**: Disable gesture handlers via environment variable
4. **Phase 4 issues**: Hide FAB and quick replies via feature toggle

Dependencies to check:
- ChatSection parent route still renders correctly
- Message streaming continues to work
- File upload functionality preserved
- Camera capture still functional

## Review
[To be filled after completion]
- What worked:
- What didn't:
- Lessons learned:

## Layout-Specific Improvements

### Thumb Zone Optimization Map
```
Screen Height: 100vh
├── 0-33vh:  🔴 HARD REACH (avoid critical actions)
│            ├── Status indicators only
│            ├── Non-essential info
│            └── Auto-hide floating header
├── 33-66vh: 🟡 MEDIUM REACH (secondary actions)
│            ├── Message content area
│            ├── Occasional quick actions
│            └── Gesture-triggered features
└── 66-100vh: 🟢 EASY REACH (primary actions)
             ├── Input area (always visible)
             ├── Send/voice button (primary)
             ├── Attachment controls
             └── FAB for wellness actions
```

### Visual Hierarchy Rules
1. **Information Density**: Max 3 UI elements per horizontal row
2. **Color Weight**: Primary actions use brand color, secondary use neutral
3. **Size Scaling**: Touch targets 44px+ with 8px spacing minimum
4. **Typography**: 16px+ body text, 14px+ secondary text
5. **Motion**: Entrance animations from bottom-up (natural thumb movement)

### Layout Code Examples
```css
/* Mobile-first container with thumb zones */
.chat-container {
  display: grid;
  grid-template-rows: 
    minmax(0, 0.33fr)  /* Hard reach - minimal content */
    minmax(0, 0.33fr)  /* Medium reach - scrollable content */
    auto;              /* Easy reach - fixed input */
  height: 100vh;
  height: 100dvh; /* Dynamic viewport for mobile browsers */
}

/* Thumb-optimized spacing scale */
.thumb-spacing-xs { gap: 8px; }   /* Between related elements */
.thumb-spacing-sm { gap: 16px; }  /* Between different sections */
.thumb-spacing-md { gap: 24px; }  /* Between critical actions */
.thumb-spacing-lg { gap: 32px; }  /* Major layout sections */
```

## Success Criteria
- [ ] Time to send first message reduced by 30%
- [ ] Voice input usage increases to >40% for health conversations
- [ ] Gesture adoption rate >60% within 2 weeks
- [ ] User satisfaction score improves by 15%
- [ ] Zero increase in error rates
- [ ] Performance metrics maintained or improved
- [ ] **NEW**: 95% of interactions within easy/medium thumb reach zones
- [ ] **NEW**: Average tap accuracy improves by 25% (fewer mis-taps)
- [ ] **NEW**: One-handed usage completion rate >85%