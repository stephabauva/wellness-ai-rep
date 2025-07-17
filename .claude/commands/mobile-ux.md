# mobile-ux.md

## Mobile UX Psychology & Friction Analysis

**Purpose**: Expert guidance for mobile UI/UX optimization focused on user psychology, friction reduction, and mobile-first wellness interactions.

## Core Mobile Psychology Principles

### 1. Cognitive Load Reduction
- **3-Second Rule**: User should understand screen purpose within 3 seconds
- **Thumb Zone**: 75% of interactions in easy thumb reach (bottom 2/3 of screen)
- **Progressive Disclosure**: Show only essential info first, details on demand
- **Decision Fatigue**: Max 3-5 choices per screen for wellness decisions

### 2. Trust & Safety Psychology (Wellness Context)
- **Data Sensitivity**: Health data requires extra visual privacy cues
- **Permission Priming**: Explain why before asking for health permissions
- **Progress Indicators**: Always show data processing status (builds trust)
- **Error Recovery**: Gentle, non-alarming error messages for health features

## Friction Point Analysis

### Common Mobile Friction Points
1. **Input Friction**
   - Long forms → Break into steps with progress bar
   - Text typing → Use voice input for health logs
   - Date selection → Smart defaults (today, yesterday)
   - Number entry → Sliders/steppers for health metrics

2. **Navigation Friction**
   - Deep hierarchies → Flatten to max 3 levels
   - Hidden features → Persistent FAB for key actions
   - Back confusion → Clear breadcrumbs/headers
   - Tab overload → Max 5 bottom tabs

3. **Performance Friction**
   - Slow loads → Skeleton screens, not spinners
   - Network delays → Optimistic UI updates
   - Large lists → Virtual scrolling + lazy load
   - Animation jank → 60fps or remove animation

## Wellness App Specific UX

### Health Data Entry Psychology
```typescript
// GOOD: Reduces input friction
<HealthMetricSlider 
  defaultValue={lastKnownValue}
  quickPresets={[70, 80, 90, 100]} // Common values
  hapticFeedback={true}
/>

// BAD: High cognitive load
<input type="number" placeholder="Enter value" />
```

### AI Chat Mobile Optimization
- **Message bubbles**: Max 3-4 lines before "Read more"
- **Quick replies**: Suggested responses reduce typing
- **Voice input**: Primary for longer health descriptions
- **Scroll behavior**: Auto-scroll only when user at bottom

### Mobile-First Component Patterns
```typescript
// Touch-optimized spacing
const TouchTarget = {
  minHeight: '44px', // iOS HIG minimum
  minWidth: '44px',
  padding: '12px',
  margin: '8px' // Prevent mis-taps
};

// Gesture-aware modals
const BottomSheet = {
  swipeToClose: true,
  snapPoints: ['25%', '50%', '90%'],
  defaultSnap: '50%'
};
```

## Pre-Implementation Checklist

### Mobile UX Analysis
- [ ] Thumb reachability map created
- [ ] Loading states for all async operations
- [ ] Offline capability for critical features
- [ ] Touch target audit (min 44x44px)
- [ ] Text size audit (min 16px body)

### Psychology Checkpoints
- [ ] Onboarding under 3 screens
- [ ] Permission requests contextualized
- [ ] Error messages helpful, not scary
- [ ] Success feedback immediate
- [ ] Progress always visible

## Mobile Performance Impact

### Psychological Performance
- **Perceived speed**: Skeleton > spinner
- **Interaction feedback**: <100ms response
- **Animation timing**: 200-300ms sweet spot
- **Loading perception**: Progress > indefinite

### Technical Optimizations
```bash
# Mobile bundle analysis
npm run build -- --analyze
# Target: <200KB initial JS

# Image optimization
# Use WebP with fallbacks
# Lazy load below fold
# 2x max for retina
```

## Accessibility as Friction Reduction

### Motor Accessibility
- Larger touch targets for health logging
- Swipe alternatives to precise taps
- Voice commands for complex inputs
- Gesture shortcuts for frequent actions

### Cognitive Accessibility
- Simple language for health terms
- Visual progress for multi-step flows
- Undo capability for all actions
- Clear action consequences upfront

## Testing Mobile UX

### Friction Detection Methods
1. **One-thumb test**: Complete flow with one hand
2. **Interruption test**: Resume after phone call
3. **Glance test**: 5-second understanding
4. **Stress test**: Use while walking/distracted

### Metrics to Track
- Task completion rate
- Time to first meaningful interaction
- Error rate per input type
- Rage tap frequency
- Session duration vs engagement

## Implementation Priorities

### High-Impact Quick Wins
1. Bottom sheet for all modals
2. FAB for primary wellness action
3. Voice input for health logs
4. Haptic feedback for selections
5. Pull-to-refresh everywhere

### Friction Emergency Fixes
- Form abandonment > Break into steps
- Mis-taps > Increase touch targets  
- Slow perception > Add skeletons
- Confusion > Simplify copy
- Errors > Better empty states

## Mobile-First Refactoring

### When Converting Desktop → Mobile
1. **Navigation**: Hamburger → Bottom tabs
2. **Forms**: Single column, bigger inputs
3. **Tables**: Cards with key info only
4. **Modals**: Full screen or bottom sheet
5. **Hover states**: Long-press alternatives

### Component Consolidation Strategy
- Combine similar mobile components
- Share gesture handlers
- Unified touch feedback system
- Consistent spacing system
- Single source of mobile breakpoints

Remember: Every tap is a micro-commitment. Make each one worth it.