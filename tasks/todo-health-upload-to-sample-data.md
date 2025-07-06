# Todo: Remove Health Upload and Add Sample Data Generation

## Scope
- Remove file upload functionality from health dashboard
- Keep Go acceleration service intact for file manager
- Add sample data generation with time range options
- Technical context: Health dashboard should only receive data from smartphone apps, not file uploads
- The current implementation of the file upload can be read at .system-maps/json-system-maps/health/health-data-import.feature.json

## Risk Assessment
- **Dependencies affected**: 
  - Health dashboard components
  - Health data API endpoints
  - Go acceleration service (must remain functional)
  - File manager functionality
- **Potential conflicts**: 
  - Must ensure Go acceleration continues working for file manager
  - Database schema remains unchanged

## Tasks
### Phase 1: Remove Upload Functionality
- [ ] Remove HealthDataImport component usage from HealthDataSection
- [ ] Delete HealthDataImport.tsx component file
- [ ] Remove parse and import endpoints from health-routes.ts
- [ ] Ensure Go acceleration auto-start logic remains in shared-utils.ts

### Phase 2: Create Sample Data Generation
- [ ] Create health data sample generator utility
  - Generate realistic health metrics (steps, heart rate, sleep, nutrition, etc.)
  - Support 7, 30, and 90 day time ranges
  - Include proper timestamps and categories
- [ ] Add "Load Sample Data" button to HealthDataSection
  - Include dropdown for time range selection
  - Show loading state during generation
- [ ] Create API endpoint for sample data generation
  - POST /api/health-data/generate-sample
  - Clear existing data before inserting samples
  - Use batch insert for performance

### Phase 3: Integration & Testing
- [ ] Test sample data displays correctly in all dashboard views
- [ ] Verify time range filtering works properly
- [ ] Ensure trends and charts show meaningful data
- [ ] Update system maps to reflect new architecture

## Safety Checks
- [ ] Go acceleration service remains functional for file manager
- [ ] No health upload code remains in the codebase
- [ ] Sample data generation is production-ready
- [ ] All existing health dashboard features work with sample data
- [ ] No unused imports or dead code

## Technical Details

### Sample Data Structure
```typescript
interface SampleHealthMetric {
  dataType: string;
  value: string;
  unit?: string;
  timestamp: Date;
  category: string;
  userId: number;
}
```

### Sample Data Types to Generate
- **Body Composition**: weight, bmi, body_fat_percentage
- **Cardiovascular**: heart_rate, blood_pressure_systolic, blood_pressure_diastolic
- **Activity**: steps, active_minutes, calories_burned, distance
- **Sleep**: sleep_total, sleep_deep, sleep_light, sleep_rem
- **Nutrition**: calories, protein, carbs, fat, water_intake
- **Advanced**: vo2_max, resting_heart_rate, heart_rate_variability

### Generation Algorithm
1. Generate base values with realistic ranges
2. Add daily variations using sine waves for natural patterns
3. Include random variations for realism
4. Ensure proper time distribution across selected range
5. Batch insert with deduplication

## Review
[To be filled after completion]