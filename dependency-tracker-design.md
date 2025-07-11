# Dependency Tracking System Design

## Overview
Track "who uses what" across the codebase to prevent breaking changes when modifying shared code.

## Implementation Approach

### 1. Automatic Dependency Scanning
```javascript
// dependency-tracker.js
class DependencyTracker {
  async scan() {
    // Phase 1: Build dependency graph
    const imports = await this.scanAllImports();
    const apiCalls = await this.scanAPIUsage();
    const componentUsage = await this.scanComponentUsage();
    
    // Phase 2: Generate reverse dependency map
    const reverseMap = this.buildReverseMap(imports, apiCalls, componentUsage);
    
    // Phase 3: Annotate with domain info
    return this.addDomainContext(reverseMap);
  }
}
```

### 2. Inline Annotations (Comment-Based)
```typescript
/**
 * @used-by chat/ChatInputArea
 * @used-by file-manager/FileList
 * @used-by settings/FileManagement
 * @cross-domain true
 * @critical-path true
 */
export function compressFile(file: File): Promise<Blob> {
  // ...
}
```

### 3. Generated Dependency Maps
```json
{
  "client/src/components/AttachmentPreview.tsx": {
    "usedBy": [
      {
        "file": "client/src/components/ChatSection.tsx",
        "domain": "chat",
        "importType": "named"
      },
      {
        "file": "client/src/components/MessageDisplayArea.tsx", 
        "domain": "chat",
        "importType": "named"
      }
    ],
    "domains": ["chat"],
    "crossDomain": false,
    "riskLevel": "medium"
  }
}
```

### 4. Pre-commit Hook Integration
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check if modified files have cross-domain dependencies
node dependency-tracker.js --check-modified

# Warn about high-risk changes
# "WARNING: You're modifying AttachmentPreview.tsx which is used by:
#  - chat domain (2 components)
#  - file-manager domain (1 component)
# Please ensure compatibility!"
```

### 5. VS Code Integration
```javascript
// VS Code extension to show usage on hover
// "This function is used by:
//  • ChatInputArea (chat)
//  • FileUploadDialog (file-manager)
//  • HealthDataUpload (health)"
```

## Benefits
1. **Immediate visibility** of impact when modifying code
2. **Prevents accidental breakage** of dependent features
3. **Documents implicit relationships** not captured in system maps
4. **Enables safe refactoring** with confidence

## Implementation Priority
1. Start with critical shared components (AttachmentPreview, etc.)
2. Add API endpoint tracking
3. Expand to all functions/classes
4. Integrate with development workflow