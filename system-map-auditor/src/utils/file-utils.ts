import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, resolve, relative, dirname, extname } from 'path';
import { glob } from 'glob';

export class FileUtils {
  /**
   * Safely read a JSON file and parse it
   */
  static readJsonFile<T = any>(filePath: string): T | null {
    try {
      if (!existsSync(filePath)) {
        return null;
      }
      
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Failed to read JSON file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if a file exists and is readable
   */
  static fileExists(filePath: string): boolean {
    try {
      return existsSync(filePath) && statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists
   */
  static directoryExists(dirPath: string): boolean {
    try {
      return existsSync(dirPath) && statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Find files matching patterns with exclusions
   */
  static async findFiles(
    rootDir: string,
    includePatterns: string[],
    excludePatterns: string[] = []
  ): Promise<string[]> {
    const allFiles: Set<string> = new Set();

    // Process include patterns
    for (const pattern of includePatterns) {
      try {
        const matches = await glob(pattern, {
          cwd: rootDir,
          absolute: true,
          ignore: excludePatterns
        });
        matches.forEach(file => allFiles.add(file));
      } catch (error) {
        console.warn(`Failed to process pattern ${pattern}:`, error);
      }
    }

    return Array.from(allFiles);
  }

  /**
   * Get relative path from a base directory
   */
  static getRelativePath(from: string, to: string): string {
    return relative(from, to);
  }

  /**
   * Resolve a path relative to a base directory
   */
  static resolvePath(basePath: string, relativePath: string): string {
    return resolve(basePath, relativePath);
  }

  /**
   * Get the directory containing a file
   */
  static getDirectory(filePath: string): string {
    return dirname(filePath);
  }

  /**
   * Get file extension
   */
  static getExtension(filePath: string): string {
    return extname(filePath);
  }

  /**
   * Find system map files in a directory
   */
  static findSystemMaps(rootDir: string): string[] {
    const systemMapsDir = join(rootDir, '.system-maps');
    
    if (!this.directoryExists(systemMapsDir)) {
      return [];
    }

    try {
      return this.findSystemMapFiles(systemMapsDir);
    } catch (error) {
      console.warn(`Failed to scan system maps directory:`, error);
      return [];
    }
  }

  /**
   * Recursively find all .map.json and .feature.json files
   */
  private static findSystemMapFiles(dir: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          files.push(...this.findSystemMapFiles(fullPath));
        } else if (entry.isFile() && (
          entry.name.endsWith('.map.json') || 
          entry.name.endsWith('.feature.json') ||
          entry.name === 'root.map.json'
        )) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${dir}:`, error);
    }
    
    return files;
  }

  /**
   * Find the project root directory by looking for common markers
   */
  static findProjectRoot(startDir: string = process.cwd()): string {
    const markers = ['package.json', '.git', 'tsconfig.json', '.system-maps'];
    let currentDir = resolve(startDir);
    
    while (currentDir !== dirname(currentDir)) {
      for (const marker of markers) {
        const markerPath = join(currentDir, marker);
        if (existsSync(markerPath)) {
          return currentDir;
        }
      }
      currentDir = dirname(currentDir);
    }
    
    // Fall back to current directory if no markers found
    return resolve(startDir);
  }

  /**
   * Normalize path separators for cross-platform compatibility
   */
  static normalizePath(path: string): string {
    return path.replace(/\\/g, '/');
  }

  /**
   * Check if a path matches any of the given patterns
   */
  static matchesPatterns(filePath: string, patterns: string[]): boolean {
    const normalizedPath = this.normalizePath(filePath);
    
    return patterns.some(pattern => {
      const normalizedPattern = this.normalizePath(pattern);
      
      // Simple glob matching - can be enhanced with a proper glob library
      if (normalizedPattern.includes('*')) {
        const regex = new RegExp(
          normalizedPattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '[^/]')
        );
        return regex.test(normalizedPath);
      }
      
      return normalizedPath.includes(normalizedPattern);
    });
  }

  /**
   * Check if file should be excluded based on patterns
   */
  static shouldExclude(filePath: string, excludePatterns: string[]): boolean {
    return this.matchesPatterns(filePath, excludePatterns);
  }

  /**
   * Get file size in bytes
   */
  static getFileSize(filePath: string): number {
    try {
      return statSync(filePath).size;
    } catch {
      return 0;
    }
  }

  /**
   * Get file modification time
   */
  static getModificationTime(filePath: string): Date | null {
    try {
      return statSync(filePath).mtime;
    } catch {
      return null;
    }
  }
}