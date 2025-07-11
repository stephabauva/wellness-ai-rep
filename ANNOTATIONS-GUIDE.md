# @used-by Annotations Guide

## Purpose
Track dependencies and warn developers about cross-domain impacts when modifying shared code.

## Annotation Format

### Basic Usage
```typescript
/**
 * @used-by domain/component - Description of usage
 * @used-by domain/component - Description of usage
 * @cross-domain true
 * @critical-path true
 */
export function myFunction() {
  // ...
}
```

### Full Annotation Set
```typescript
/**
 * @used-by chat/ChatInputArea - For file attachments in chat messages
 * @used-by file-manager/FileList - For displaying file thumbnails
 * @used-by health/HealthDataUpload - For health file processing
 * @cross-domain true
 * @critical-path true
 * @shared-component true
 * @risk Different domains may expect different behaviors
 * @behavior-note File manager skips compression for media files
 * @behavior-note Health data always compresses for storage efficiency
 * @performance-impact High CPU usage for large files
 * @service-type core
 * @recommendation Consider creating domain-specific variants
 * @impact Changes affect file upload across all domains
 */
export class FileCompressionService {
```

## Annotation Types

### Required Annotations
- `@used-by domain/component` - Where this code is used
- `@cross-domain true` - Marks cross-domain dependencies

### Optional Annotations
- `@critical-path true` - High-impact component
- `@shared-component true` - Reusable UI component
- `@service-type core|shared|infrastructure` - Service classification
- `@risk description` - Potential risks of changes
- `@behavior-note description` - Domain-specific behaviors
- `@performance-impact description` - Performance considerations
- `@recommendation description` - Architectural suggestions
- `@impact description` - Overall impact of changes

## Domain Naming Convention

### Primary Domains
- `chat` - Chat functionality
- `file-manager` - File management
- `health` - Health data processing
- `memory` - Memory and recall system
- `settings` - User preferences

### Infrastructure Domains
- `infrastructure/database` - Database connections
- `infrastructure/cache` - Caching services
- `infrastructure/logging` - Logging services
- `infrastructure/routing` - Route handlers

### Shared Domains
- `shared/ui-components` - Reusable UI components
- `shared/hooks` - React hooks
- `shared/utilities` - Utility functions
- `shared/services` - Generic services
- `shared/types` - Type definitions
- `app/root` - Core app files

## Examples

### Cross-Domain Hook
```typescript
/**
 * @used-by chat/ChatSection - Main chat interface file management
 * @used-by chat/ChatInputArea - File upload functionality
 * @used-by chat/MessageDisplayArea - Display attached files
 * @cross-domain true
 * @critical-path true
 * @recommendation Consider creating chat-specific file handling abstraction
 * @impact Changing this hook affects chat file attachments
 */
export const useFileManagement = () => {
```

### Shared UI Component
```typescript
/**
 * @used-by chat/ChatSection - Display file attachments in chat
 * @used-by file-manager/FileList - Preview files in grid/list view
 * @used-by health/HealthDataUpload - Show uploaded health files
 * @cross-domain true
 * @shared-component true
 * @risk Different domains may expect different preview behaviors
 * @recommendation Consider domain-specific variants or configuration
 */
export function AttachmentPreview({
```

### Core Service
```typescript
/**
 * @used-by chat/chat-routes - Memory detection in chat messages
 * @used-by memory/memory-routes - Direct memory operations
 * @used-by infrastructure/routing - Background memory processing
 * @cross-domain true
 * @critical-path true
 * @service-type core
 * @performance-impact <50ms target for critical memory paths
 * @impact Changes affect chat memory detection and storage
 */
class MemoryService {
```

## Benefits

1. **Immediate Impact Visibility** - See what will break before making changes
2. **Architectural Documentation** - Living documentation in the code
3. **Safer Refactoring** - Know dependencies before modifying
4. **Cross-Domain Awareness** - Understand domain boundaries
5. **Pre-commit Validation** - Automated checks prevent issues

## Workflow Integration

1. **Before modifying shared code**: Check existing annotations
2. **When adding new usage**: Update @used-by annotations
3. **During code review**: Verify annotations are current
4. **Pre-commit hook**: Automatically validates dependencies

## Maintenance

- Update annotations when adding/removing dependencies
- Remove annotations when usage is eliminated
- Add new annotation types as needed
- Regular audit via `dependency-tracker.js`