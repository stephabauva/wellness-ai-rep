#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Get recently modified files from git
function getModifiedFiles() {
  try {
    const output = execSync('git status --porcelain', { encoding: 'utf8' });
    return output.split('\n')
      .filter(line => line.trim())
      .map(line => line.substring(3)) // Remove git status prefix
      .filter(file => file.trim());
  } catch (error) {
    console.error('Error getting git status:', error.message);
    return [];
  }
}

// Recursively find all .map.json files in system-maps directory
function findSystemMaps(dir) {
  const maps = [];
  
  function traverse(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          traverse(fullPath);
        } else if (entry.name.endsWith('.map.json') || entry.name.endsWith('.feature.json')) {
          maps.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${currentDir}:`, error.message);
    }
  }
  
  traverse(dir);
  return maps;
}

// Search for file mentions in system maps (excluding images and PDFs)
function searchFileInMaps(filename, mapFiles) {
  const foundIn = [];
  
  // Skip images and PDFs
  const skipExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf'];
  if (skipExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
    return foundIn;
  }
  
  for (const mapFile of mapFiles) {
    try {
      const content = fs.readFileSync(mapFile, 'utf8');
      const relativePath = path.relative(process.cwd(), mapFile);
      
      // Check if filename appears in the map content
      if (content.includes(filename)) {
        foundIn.push(relativePath);
      }
    } catch (error) {
      console.warn(`Warning: Could not read map file ${mapFile}:`, error.message);
    }
  }
  
  return foundIn;
}

// Categorize files by domain based on system map structure
function categorizeFile(filename, mapFiles) {
  const categories = {
    'chat': [],
    'health': [],
    'memory': [],
    'file-manager': [],
    'settings': [],
    'routes': [],
    'infrastructure': [],
    'uncategorized': []
  };
  
  // Find which maps mention this file
  const mentionedIn = searchFileInMaps(filename, mapFiles);
  
  if (mentionedIn.length === 0) {
    categories.uncategorized.push(filename);
    return categories;
  }
  
  // Categorize based on map paths
  let categorized = false;
  for (const mapPath of mentionedIn) {
    if (mapPath.includes('/chat/')) {
      categories.chat.push(filename);
      categorized = true;
    } else if (mapPath.includes('/health/')) {
      categories.health.push(filename);
      categorized = true;
    } else if (mapPath.includes('/memory/')) {
      categories.memory.push(filename);
      categorized = true;
    } else if (mapPath.includes('/file-manager/')) {
      categories['file-manager'].push(filename);
      categorized = true;
    } else if (mapPath.includes('/settings/')) {
      categories.settings.push(filename);
      categorized = true;
    } else if (mapPath.includes('/routes/')) {
      categories.routes.push(filename);
      categorized = true;
    } else if (mapPath.includes('/infrastructure/')) {
      categories.infrastructure.push(filename);
      categorized = true;
    }
  }
  
  if (!categorized) {
    categories.uncategorized.push(filename);
  }
  
  return categories;
}

// Main auditor function
function auditFiles() {
  console.log('Looking at the modified files...\n');
  
  const modifiedFiles = getModifiedFiles();
  
  if (modifiedFiles.length === 0) {
    console.log('No recently modified files found.');
    return;
  }
  
  const systemMapsDir = '.system-maps/json-system-maps';
  if (!fs.existsSync(systemMapsDir)) {
    console.error(`System maps directory not found: ${systemMapsDir}`);
    return;
  }
  
  const mapFiles = findSystemMaps(systemMapsDir);
  console.log(`Scanning ${mapFiles.length} system maps...\n`);
  
  // Analyze each modified file
  for (const file of modifiedFiles) {
    const mentionedIn = searchFileInMaps(file, mapFiles);
    const fileName = path.basename(file);
    
    console.log(`${fileName}:`);
    if (mentionedIn.length > 0) {
      mentionedIn.forEach(map => console.log(`  - ${map}`));
    } else {
      console.log(`  (not mentioned in any system maps)`);
    }
    console.log();
  }
}

// Run the auditor
auditFiles();