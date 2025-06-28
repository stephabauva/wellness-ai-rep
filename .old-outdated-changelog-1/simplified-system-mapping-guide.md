
# Simplified System Mapping Guide for Validation

## Core Philosophy

System maps exist for **one primary purpose**: catching broken features when code changes. They should be simple, accurate representations that enable automated validation without complexity overhead.

## Architecture: Keep It Simple

### File Structure
```
.system-maps/
├── root.map.json          # Domain manifest only
├── chat.map.json          # Core user domain
├── health.map.json        # Core user domain  
├── memory.map.json        # Core user domain
├── file-manager.map.json  # Core user domain
└── settings.map.json      # Core user domain
```

**Rule**: Stick to 5 core user domains. No sub-directories, no feature files, no infrastructure maps.

### When to Split
- **Never split by infrastructure concerns** (logging, performance, testing)
- **Never create sub-directories** - keep maps at root level
- **Keep domains focused on user features** - what users actually interact with

## Simplified Schema

### Root Map (root.map.json)
```json
{
  "appName": "App Name",
  "version": "1.0.0", 
  "lastUpdated": "2025-06-28T10:00:00Z",
  "domains": {
    "chat": {
      "description": "Conversational AI and messaging",
      "path": "./.system-maps/chat.map.json"
    },
    "health": {
      "description": "Health data and metrics",
      "path": "./.system-maps/health.map.json"
    }
  }
}
```

### Domain Map (e.g., health.map.json)
```json
{
  "name": "health",
  "lastUpdated": "2025-06-28T10:00:00Z",
  "components": {
    "AddMetricsModal": "client/src/components/health/AddMetricsModal.tsx",
    "HealthDataImport": "client/src/components/health/HealthDataImport.tsx"
  },
  "apiEndpoints": {
    "/api/health-consent/visibility": "GET server/routes/health-routes.ts",
    "/api/health/import": "POST server/routes/health-routes.ts"
  },
  "database": {
    "health_metrics": "shared/schema.ts",
    "health_consent": "shared/schema.ts"
  }
}
```

## Validation Focus

The auditor should check **only these critical issues**:

1. **Component Existence**: Does the file actually exist?
2. **API Endpoint Validation**: Is the endpoint actually handled?
3. **Basic Structure**: Is the JSON valid?

**Do NOT validate**:
- Circular dependencies
- Architecture patterns  
- Performance metrics
- Dead code detection
- Complex dependency analysis

## Creating/Updating Maps

### When Adding a Feature
1. Add component path to appropriate domain map
2. Add API endpoints if created
3. Update database tables if modified
4. Run auditor to verify

### After Refactoring
1. Run auditor to find broken references
2. Update paths in system maps
3. Re-run auditor until clean

## Success Metrics

- **Speed**: Full audit completes in <10 seconds
- **Simplicity**: 3 commands maximum (`audit`, `audit --quick`, `audit --domain=x`)
- **Accuracy**: Catches missing components/APIs with 0% false positives
- **Maintenance**: System maps stay under 100 lines each

## Anti-Patterns to Avoid

❌ **Complex directory structures** (sub-domains, feature files)  
❌ **Infrastructure domains** (logging, performance, testing)  
❌ **Granular validation flags** (too many CLI options)  
❌ **Architecture analysis** (circular dependency detection)  
❌ **Performance monitoring** (trend analysis, metrics)  

✅ **Simple file validation**  
✅ **Core user domains only**  
✅ **Single audit command**  
✅ **Fast feedback loop**  
✅ **Minimal maintenance**

## Migration from Complex Maps

If you have complex system maps:

1. **Consolidate infrastructure maps** into core domains
2. **Remove sub-directories** - flatten to root level  
3. **Delete feature files** - inline into main maps
4. **Focus on user-facing functionality** only
5. **Remove unused domains** (logging, performance, testing)

The goal is maintainable validation, not comprehensive documentation.
