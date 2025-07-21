# Dependency Maps

This directory contains split dependency maps organized by domain to avoid merge conflicts.

## Structure

- `index.json` - Overview of all domain dependency maps
- `{domain}-dependencies.json` - Individual domain dependency files

## Benefits

- **Smaller files**: Each domain has its own dependency file
- **Reduced merge conflicts**: Changes to different domains don't conflict
- **Better organization**: Dependencies grouped by architectural domain
- **Faster processing**: Tools can load only relevant domain data

## Usage

### Generate Split Maps (Default)
```bash
node dependency-tracker.js
```

### Generate Legacy Single File (if needed)
```bash
node dependency-tracker.js --legacy-format
```

## File Format

Each domain dependency file contains:
```json
{
  "domain": "domain-name",
  "lastUpdated": "ISO-timestamp",
  "dependencies": {
    "file-path": {
      "domain": "original-domain",
      "exports": ["exported-items"],
      "usedBy": [
        {
          "file": "importing-file",
          "domain": "importing-domain", 
          "imports": ["imported-items"]
        }
      ],
      "crossDomain": boolean,
      "usageCount": number
    }
  }
}
```

## Migration Notes

- Old `dependency-map.json` is now generated only with `--legacy-format` flag
- Tools should be updated to read from split maps for better performance
- Each domain map is much smaller and easier to process