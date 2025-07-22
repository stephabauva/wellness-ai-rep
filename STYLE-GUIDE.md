# Wellness AI App Style Guide

This comprehensive style guide is based on the health dashboard page design patterns and should be applied consistently across all pages of the application.

## Design Philosophy

- **Mobile-First**: Every design decision prioritizes mobile experience
- **Performance-Focused**: Smooth animations with hardware acceleration
- **Accessibility**: Touch-friendly targets, clear contrast ratios
- **Consistency**: Unified design language across all components
- **Delightful Interactions**: Subtle animations that enhance user experience

## Color System

### Light Mode
```css
/* Core Colors */
--background: hsl(0 0% 100%);           /* Pure white */
--foreground: hsl(20 14.3% 4.1%);      /* Near-black text */
--primary: hsl(162 85% 40%);           /* Vibrant teal */
--secondary: hsl(217 91% 60%);         /* Bright blue */
--destructive: hsl(0 84.2% 60.2%);     /* Red for warnings */

/* Gradient System */
--hero-gradient-from: hsl(134 239% 60%);  /* Bright green */
--hero-gradient-via: hsl(217 91% 60%);   /* Bright blue */
--hero-gradient-to: hsl(271 81% 56%);    /* Purple */

/* Neutral Palette */
--muted: hsl(60 4.8% 95.9%);           /* Light gray background */
--border: hsl(20 5.9% 90%);            /* Subtle borders */
```

### Dark Mode
```css
/* Core Colors */
--background: hsl(240 10% 3.9%);        /* Deep dark blue */
--foreground: hsl(0 0% 98%);            /* Near-white text */
--primary: hsl(162 85% 40%);           /* Same vibrant teal */
--secondary: hsl(217 91% 60%);         /* Same bright blue */
--destructive: hsl(0 62.8% 30.6%);     /* Darker red */

/* Gradient System */
--hero-gradient-from: hsl(134 239% 35%);  /* Darker green */
--hero-gradient-via: hsl(217 91% 35%);   /* Darker blue */
--hero-gradient-to: hsl(271 81% 35%);    /* Darker purple */

/* Neutral Palette */
--muted: hsl(240 3.7% 15.9%);          /* Dark gray background */
--border: hsl(240 3.7% 15.9%);         /* Subtle dark borders */
```

### Semantic Colors
- **Success**: Green (`text-green-500`, `bg-green-50` light / `bg-green-900/20` dark)
- **Warning**: Amber (`text-amber-500`, `bg-amber-50` light / `bg-amber-900/20` dark)
- **Achievement**: Purple (`text-purple-500`, `bg-purple-50` light / `bg-purple-900/20` dark)
- **Info**: Blue (primary color)

## Typography

### Font Family
- **System Font Stack**: Uses native system fonts for optimal performance
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  ```

### Font Sizes & Weights
- **Page Title**: `text-2xl font-bold` (24px, 700)
- **Section Headers**: `text-lg font-semibold` (18px, 600)
- **Card Titles**: `text-sm font-medium` (14px, 500)
- **Body Text**: `text-sm` (14px, 400)
- **Small Text**: `text-xs` (12px, 400)
- **Large Numbers**: `text-4xl font-bold` (36px, 700)

### Text Colors
- **Primary Text**: `text-gray-900 dark:text-white`
- **Secondary Text**: `text-gray-600 dark:text-gray-400`
- **Muted Text**: `text-gray-500 dark:text-gray-400`
- **Interactive Text**: Use semantic colors (green, blue, etc.)

## Layout & Spacing

### Container System
```css
/* Mobile padding */
px-4 (16px horizontal padding)

/* Vertical spacing between sections */
mb-6 (24px margin bottom)

/* Component internal spacing */
p-4 (16px padding)
p-6 (24px padding for hero sections)
```

### Grid System
- **Mobile (default)**: `grid-cols-2` (2 columns)
- **Tablet (sm)**: `sm:grid-cols-2` or `sm:grid-cols-3`
- **Desktop (md+)**: `md:grid-cols-3` up to `lg:grid-cols-6`
- **Gap**: `gap-3` (12px) on mobile, `sm:gap-4` (16px) on larger screens

## Component Patterns

### Cards
```css
/* Base card styles */
.card {
  @apply bg-white dark:bg-gray-800 
         rounded-xl 
         shadow-sm 
         border border-gray-200 dark:border-gray-700
         transition-all duration-300 ease-out
         hover:shadow-lg hover:scale-[1.03] hover:-translate-y-1
         active:scale-[0.97] active:translate-y-0;
}
```

### Buttons

#### Primary Button
```css
bg-blue-500 hover:bg-blue-600 
text-white 
rounded-xl 
px-4 py-2
transition-all duration-300 ease-out
hover:scale-105 hover:shadow-lg
active:scale-95
```

#### Secondary Button
```css
bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
text-gray-700 dark:text-gray-200
rounded-xl 
px-4 py-2
```

#### Destructive Button
```css
bg-red-500 hover:bg-red-600 
text-white
rounded-xl 
px-4 py-2
```

#### Touch Targets
- Minimum height: 44px (iOS standard)
- Minimum touch area: 88px for action buttons

### Hero Sections
```css
/* Gradient background with backdrop blur */
.hero-section {
  @apply relative rounded-2xl overflow-hidden;
  background: linear-gradient(to bottom right, 
    hsl(var(--hero-gradient-from)), 
    hsl(var(--hero-gradient-via)), 
    hsl(var(--hero-gradient-to))
  );
}

/* Overlay for readability */
.hero-overlay {
  @apply absolute inset-0 backdrop-blur-sm;
  background: hsl(var(--hero-overlay));
  opacity: var(--hero-overlay-opacity);
}
```

## Animations & Transitions

### Standard Transitions
```css
/* Default transition */
transition-all duration-300 ease-out

/* Fast interactions */
transition-all duration-150 ease-out

/* Slow reveals */
transition-all duration-500 ease-out

/* Very slow (progress bars) */
transition-all duration-1000 ease-out
```

### Hover Effects
```css
/* Card hover */
hover:scale-[1.03] hover:-translate-y-1 hover:shadow-lg

/* Button hover */
hover:scale-105 hover:shadow-lg

/* Icon hover */
hover:scale-110 hover:rotate-12
```

### Active States
```css
/* Pressed state */
active:scale-95 active:translate-y-0
```

### Hardware Acceleration
```css
transform-gpu will-change-transform
```

## Mobile-Specific Patterns

### Sticky Headers
```css
.mobile-header {
  @apply sticky top-0 z-10 
         bg-white/80 dark:bg-gray-900/80 
         backdrop-blur-md 
         border-b border-gray-200 dark:border-gray-700;
}
```

### Horizontal Scrolling
```css
.horizontal-scroll {
  @apply overflow-x-auto scrollbar-hide scroll-smooth;
  -webkit-overflow-scrolling: touch; /* iOS momentum scrolling */
}
```

### Swipe Gestures
- Implement swipe handlers for navigation
- Visual feedback during swipe
- Smooth transitions between states

### Touch Feedback
```css
/* Ripple effect on tap */
.touch-ripple {
  @apply relative overflow-hidden;
}
.touch-ripple::after {
  @apply absolute inset-0 bg-white/20 opacity-0 
         active:opacity-100 transition-opacity duration-150;
}
```

## Icons & Graphics

### Icon Sizes
- **Small**: `h-4 w-4` (16px)
- **Medium**: `h-5 w-5` (20px)
- **Large**: `h-6 w-6` (24px)

### Icon Colors
- Match semantic colors or use `currentColor`
- Gradient icons for special states

### Icon Containers
```css
.icon-container {
  @apply p-2 rounded-lg bg-[color]/10
         transition-transform duration-300 ease-out
         group-hover:scale-110;
}
```

## Floating Elements

### Floating Action Button (FAB)
```css
.fab {
  @apply fixed bottom-6 right-6 z-50
         p-4 rounded-full
         bg-gradient-to-r from-blue-500 to-purple-600
         text-white shadow-lg
         transition-all duration-300 ease-out
         hover:scale-110 hover:shadow-xl
         active:scale-95;
}
```

## Loading States

### Skeleton Screens
```css
.skeleton {
  @apply bg-gray-300 dark:bg-gray-700 rounded animate-pulse;
}
```

### Spinners
```css
.spinner {
  @apply animate-spin h-8 w-8 
         border-2 border-primary border-t-transparent 
         rounded-full;
}
```

## Best Practices

### Performance
1. Use `transform` and `opacity` for animations (GPU-accelerated)
2. Add `will-change` for elements that will animate
3. Use `transform-gpu` class for 3D transforms
4. Debounce scroll and resize handlers

### Accessibility
1. Maintain WCAG AA contrast ratios
2. Ensure 44px minimum touch targets
3. Add focus states for keyboard navigation
4. Use semantic HTML and ARIA labels

### Responsive Design
1. Mobile-first approach with progressive enhancement
2. Test on real devices, not just browser DevTools
3. Consider thumb reach zones on mobile
4. Optimize for one-handed use

### Dark Mode
1. Test all color combinations in both modes
2. Adjust opacity values for dark mode
3. Use semantic color variables, not hard-coded values
4. Ensure gradients work in both themes

## Implementation Checklist

When implementing a new page or component:

- [ ] Use the standard color palette
- [ ] Apply consistent spacing (px-4, mb-6, etc.)
- [ ] Add hover and active states to interactive elements
- [ ] Ensure touch targets are at least 44px
- [ ] Test animations on low-end devices
- [ ] Verify dark mode appearance
- [ ] Check responsive behavior at all breakpoints
- [ ] Add loading states for async operations
- [ ] Include error states and empty states
- [ ] Test with keyboard navigation