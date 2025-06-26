
# Lazy Loading Optimization Plan
**Date:** January 21, 2025
**Status:** Planning

## Overview

Implement intelligent lazy loading to reduce the flood of initial API requests that slow down app startup. Currently, all sections load data simultaneously, causing ~1.5 seconds of parallel requests and perceived sluggishness.

## Current Performance Issues

### Startup Request Flood
```
3:19:01 PM [DEBUG] [express] GET /api/health-data 200 (259ms)
3:19:01 PM [DEBUG] [express] GET /api/health-consent/visibility 200 (259ms)  
3:19:01 PM [DEBUG] [express] GET /api/devices 200 (257ms)
3:19:01 PM [DEBUG] [express] GET /api/memories/overview 200 (443ms)
3:19:01 PM [DEBUG] [express] GET /api/files 304 (307ms)
3:19:01 PM [DEBUG] [express] GET /api/categories 304 (62ms)
3:19:01 PM [DEBUG] [express] GET /api/settings 304 (118ms)
```

### Performance Impact
- **Total startup time**: ~1.5 seconds
- **Database connection pool saturation**: 5+ concurrent queries
- **Unnecessary bandwidth**: Loading hidden sections
- **Poor perceived performance**: User waits for irrelevant data

## Implementation Strategy

### Phase 1: Critical Path Optimization (Day 1)

#### 1.1 User Settings First
```typescript
// AppContext.tsx - Load settings immediately
useEffect(() => {
  // Priority 1: User settings (required for app configuration)
  loadUserSettings();
}, []);

useEffect(() => {
  // Priority 2: Only after settings loaded
  if (userSettingsLoaded) {
    loadChatData(); // Only chat section initially
  }
}, [userSettingsLoaded]);
```

#### 1.2 Chat Section Only
```typescript
// Home.tsx - Only initialize chat on startup
const [activeSections, setActiveSections] = useState(['chat']);

useEffect(() => {
  // Load only chat section data initially
  if (activeSection === 'chat') {
    initializeChatSection();
  }
}, []);
```

### Phase 2: On-Demand Section Loading (Day 2)

#### 2.1 Section-Based Data Loading
```typescript
// Hook: useLazySection.ts
export const useLazySection = (sectionName: string) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadSection = useCallback(async () => {
    if (isLoaded || isLoading) return;
    
    setIsLoading(true);
    try {
      switch (sectionName) {
        case 'health':
          await Promise.all([
            queryClient.prefetchQuery(['health-data']),
            queryClient.prefetchQuery(['devices']),
            queryClient.prefetchQuery(['health-consent'])
          ]);
          break;
        case 'memory':
          await queryClient.prefetchQuery(['memories-overview']);
          break;
        case 'files':
          await Promise.all([
            queryClient.prefetchQuery(['files']),
            queryClient.prefetchQuery(['categories'])
          ]);
          break;
      }
      setIsLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [sectionName, isLoaded, isLoading]);

  return { isLoaded, isLoading, loadSection };
};
```

#### 2.2 Section Components with Lazy Loading
```typescript
// HealthDataSection.tsx
export const HealthDataSection = () => {
  const { isLoaded, isLoading, loadSection } = useLazySection('health');
  
  useEffect(() => {
    // Load when section becomes visible
    loadSection();
  }, [loadSection]);

  if (isLoading) {
    return <SectionSkeleton />;
  }

  // Rest of component...
};
```

### Phase 3: Progressive Loading with Delays (Day 3)

#### 3.1 Staggered Loading Implementation
```typescript
// Hook: useStaggeredLoading.ts
export const useStaggeredLoading = () => {
  const [loadedSections, setLoadedSections] = useState<string[]>([]);

  useEffect(() => {
    const loadSequence = async () => {
      // Load chat immediately
      setLoadedSections(['chat']);

      // Wait 200ms, then load memory overview (lightweight)
      setTimeout(() => {
        setLoadedSections(prev => [...prev, 'memory-overview']);
      }, 200);

      // Wait 500ms, then load settings data
      setTimeout(() => {
        setLoadedSections(prev => [...prev, 'settings']);
      }, 500);

      // Wait 1000ms, then preload other sections in background
      setTimeout(() => {
        setLoadedSections(prev => [...prev, 'health', 'files']);
      }, 1000);
    };

    loadSequence();
  }, []);

  return loadedSections;
};
```

#### 3.2 Background Preloading
```typescript
// Hook: useBackgroundPreload.ts
export const useBackgroundPreload = (sections: string[]) => {
  useEffect(() => {
    const preloadWithDelay = async () => {
      for (const [index, section] of sections.entries()) {
        // Staggered delays: 100ms, 200ms, 300ms, etc.
        setTimeout(() => {
          queryClient.prefetchQuery([`${section}-data`]);
        }, (index + 1) * 100);
      }
    };

    preloadWithDelay();
  }, [sections]);
};
```

### Phase 4: Smart Caching Strategy (Day 4)

#### 4.1 Section-Aware Cache Management
```typescript
// Enhanced React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: 'always', // Only for active sections
    },
  },
});

// Section-specific cache strategies
const sectionCacheConfig = {
  chat: { staleTime: 0 }, // Always fresh
  settings: { staleTime: 30 * 60 * 1000 }, // 30 minutes
  'memory-overview': { staleTime: 2 * 60 * 1000 }, // 2 minutes
  health: { staleTime: 5 * 60 * 1000 }, // 5 minutes
  files: { staleTime: 1 * 60 * 1000 }, // 1 minute
};
```

## Implementation Timeline

### Day 1: Critical Path (4 hours)
- [ ] Implement user settings priority loading
- [ ] Modify AppContext to load chat section only
- [ ] Add loading states for sections
- [ ] Test startup performance improvement

### Day 2: On-Demand Loading (6 hours)
- [ ] Create `useLazySection` hook
- [ ] Modify section components for lazy loading
- [ ] Implement section activation triggers
- [ ] Add skeleton loading states

### Day 3: Progressive Enhancement (4 hours)
- [ ] Implement staggered loading
- [ ] Add background preloading
- [ ] Fine-tune delay timings
- [ ] Performance testing and optimization

### Day 4: Production Optimization (2 hours)
- [ ] Implement smart caching strategies
- [ ] Add performance monitoring
- [ ] Final testing and validation
- [ ] Documentation updates

## Files to Modify

### Core Context
- `client/src/context/AppContext.tsx` - Priority loading logic
- `client/src/pages/home.tsx` - Section activation management

### New Hooks
- `client/src/hooks/useLazySection.ts` - Section lazy loading
- `client/src/hooks/useStaggeredLoading.ts` - Progressive loading
- `client/src/hooks/useBackgroundPreload.ts` - Background optimization

### Section Components
- `client/src/components/HealthDataSection.tsx` - Add lazy loading
- `client/src/components/MemorySection.tsx` - Add lazy loading
- `client/src/components/FileManagerSection.tsx` - Add lazy loading
- `client/src/components/SettingsSection.tsx` - Add lazy loading

### Query Client
- `client/src/lib/queryClient.ts` - Enhanced caching strategies

## Performance Targets

### Before Optimization
- **Initial load**: 8-12 concurrent requests
- **Startup time**: ~1.5 seconds
- **Time to interactive**: ~2 seconds

### After Optimization
- **Initial load**: 2-3 critical requests only
- **Startup time**: ~300ms
- **Time to interactive**: ~500ms
- **Background loading**: Invisible to user

## Success Metrics

### Quantitative
- [ ] Reduce initial API requests from 12+ to 3 or fewer
- [ ] Improve startup time by 70%+ (1.5s → 500ms)
- [ ] Maintain 304 cache hit rates for repeated visits
- [ ] No degradation in section load times when accessed

### Qualitative
- [ ] Immediate chat interface availability
- [ ] Smooth section transitions
- [ ] No perceived loading delays for user interactions
- [ ] Maintained data freshness across sections

## Risk Mitigation

### Potential Issues
1. **Cache invalidation complexity**: Section-specific strategies may conflict
2. **User experience gaps**: Loading states must be smooth
3. **Background load timing**: Don't interfere with user interactions

### Safeguards
- Progressive rollout with feature flags
- Fallback to eager loading if lazy loading fails
- Performance monitoring to catch regressions
- User feedback collection for perceived performance

## System Map Updates

After implementation, update:
- `.system-maps/root.map.json` - Add lazy loading architecture
- Individual section maps - Document loading strategies
- Performance monitoring integration points
