import { resolve, join, dirname, isAbsolute, relative } from 'path';
import { FileUtils } from './file-utils.js';

export class PathResolver {
  private projectRoot: string;
  private systemMapsDir: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || FileUtils.findProjectRoot();
    this.systemMapsDir = join(this.projectRoot, '.system-maps');
  }

  /**
   * Resolve a system map reference ($ref) to an absolute path
   */
  resolveSystemMapRef(ref: string, currentMapPath: string): string {
    // Handle relative references
    if (ref.startsWith('./') || ref.startsWith('../')) {
      const currentDir = dirname(currentMapPath);
      return resolve(currentDir, ref);
    }

    // Handle absolute references within system maps
    if (ref.startsWith('/')) {
      return join(this.systemMapsDir, ref.substring(1));
    }

    // Handle references without leading slash (assume relative to system maps root)
    return join(this.systemMapsDir, ref);
  }

  /**
   * Resolve a file path reference from system map to actual source file
   */
  resolveSourceFile(filePath: string): string {
    // If already absolute, return as-is
    if (isAbsolute(filePath)) {
      return filePath;
    }

    // Try to resolve relative to project root
    const resolved = resolve(this.projectRoot, filePath);
    if (FileUtils.fileExists(resolved)) {
      return resolved;
    }

    // Try common source directories
    const commonDirs = ['src', 'client/src', 'server', 'shared'];
    for (const dir of commonDirs) {
      const candidate = resolve(this.projectRoot, dir, filePath);
      if (FileUtils.fileExists(candidate)) {
        return candidate;
      }
    }

    // Return the original resolution attempt
    return resolved;
  }

  /**
   * Get relative path from project root
   */
  getRelativeFromRoot(absolutePath: string): string {
    return relative(this.projectRoot, absolutePath);
  }

  /**
   * Get the project root directory
   */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Get the system maps directory
   */
  getSystemMapsDir(): string {
    return this.systemMapsDir;
  }

  /**
   * Normalize and resolve a path reference
   */
  normalizePath(path: string): string {
    return FileUtils.normalizePath(resolve(path));
  }

  /**
   * Check if a path is within the project boundaries
   */
  isWithinProject(filePath: string): boolean {
    const resolved = resolve(filePath);
    const relativePath = relative(this.projectRoot, resolved);
    
    // Path is within project if it doesn't start with '..' or '/'
    return !relativePath.startsWith('..') && !isAbsolute(relativePath);
  }

  /**
   * Resolve API endpoint path to handler file
   */
  resolveApiHandler(handlerPath: string): string {
    // Common patterns for API handlers
    const patterns = [
      handlerPath, // Direct path
      join('server', handlerPath), // Server directory
      join('server/routes', handlerPath), // Routes directory
      join('api', handlerPath), // API directory
      handlerPath + '.ts', // Add TypeScript extension
      handlerPath + '.js', // Add JavaScript extension
    ];

    for (const pattern of patterns) {
      const resolved = this.resolveSourceFile(pattern);
      if (FileUtils.fileExists(resolved)) {
        return resolved;
      }
    }

    // Return the best guess if file doesn't exist
    return this.resolveSourceFile(handlerPath);
  }

  /**
   * Convert file path to import path
   */
  filePathToImportPath(filePath: string, fromFile: string): string {
    const relativePath = relative(dirname(fromFile), filePath);
    
    // Remove file extension for imports
    const withoutExt = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
    
    // Ensure relative paths start with './'
    if (!withoutExt.startsWith('.') && !withoutExt.startsWith('/')) {
      return './' + withoutExt;
    }
    
    return FileUtils.normalizePath(withoutExt);
  }

  /**
   * Find all possible locations for a component
   */
  findComponentLocations(componentName: string): string[] {
    const locations: string[] = [];
    const searchDirs = [
      'src/components',
      'client/src/components', 
      'src/pages',
      'client/src/pages',
      'src/hooks',
      'client/src/hooks',
      'src/utils',
      'client/src/utils',
      'shared'
    ];

    const extensions = ['.tsx', '.ts', '.jsx', '.js'];
    
    for (const dir of searchDirs) {
      const fullDir = join(this.projectRoot, dir);
      if (!FileUtils.directoryExists(fullDir)) continue;

      for (const ext of extensions) {
        // Direct file match
        const directFile = join(fullDir, componentName + ext);
        if (FileUtils.fileExists(directFile)) {
          locations.push(directFile);
        }

        // Directory with index file
        const indexFile = join(fullDir, componentName, 'index' + ext);
        if (FileUtils.fileExists(indexFile)) {
          locations.push(indexFile);
        }

        // Kebab-case variations
        const kebabName = componentName.replace(/([A-Z])/g, '-$1').toLowerCase();
        const kebabFile = join(fullDir, kebabName + ext);
        if (FileUtils.fileExists(kebabFile)) {
          locations.push(kebabFile);
        }
      }
    }

    return locations;
  }
}