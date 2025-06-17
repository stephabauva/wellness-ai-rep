# Health Dashboard Metrics Control System - Implementation Issues

## Current Issue
**Date**: June 17, 2025
**Feature**: Inline checkbox removal system for health dashboard metrics

### Problems Identified:
1. **Checkbox positioning**: Checkboxes appear on the right side of metric cards instead of the left
2. **Limited checkbox visibility**: Checkboxes only appear in the "Key Metrics Overview" section at the top, but not for metrics in the category tabs (Overview, Body, Cardiovascular, etc.)

### Root Cause Analysis:
- The checkbox implementation was only added to the `KeyMetricsOverview` component
- The positioning uses `top-2 right-2` instead of `top-2 left-2`
- Other metric display components in the category tabs don't have checkbox functionality

### Required Fixes:
1. Change checkbox positioning from right to left side
2. Identify all components that display metrics in category tabs
3. Add checkbox functionality to all metric display components
4. Ensure consistent removal mode behavior across all dashboard sections

### Components to Update:
- `KeyMetricsOverview.tsx` - Fix positioning
- Category tab content components - Add checkbox functionality
- Ensure removal mode state is passed to all metric display areas