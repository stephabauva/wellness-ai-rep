import { readFileSync } from 'fs';
import { FileUtils } from '../utils/file-utils.js';
import { PathResolver } from '../utils/path-resolver.js';
import type { 
  ParsedCodebase, 
  ComponentInfo, 
  ApiInfo, 
  ImportInfo, 
  ValidationIssue,
  AuditConfig 
} from '../core/types.js';

export class CodebaseScanner {
  private pathResolver: PathResolver;
  private config: AuditConfig;

  constructor(config: AuditConfig, projectRoot?: string) {
    this.pathResolver = new PathResolver(projectRoot);
    this.config = config;
  }

  /**
   * Scan the entire codebase and extract components, APIs, and dependencies
   */
  async scanCodebase(): Promise<{ codebase: ParsedCodebase; issues: ValidationIssue[] }> {
    const issues: ValidationIssue[] = [];
    const codebase: ParsedCodebase = {
      components: new Map(),
      apis: new Map(),
      dependencies: { nodes: new Map(), edges: [] }
    };

    try {
      // Find all source files
      const sourceFiles = await this.findSourceFiles();
      
      // Scan each file
      for (const filePath of sourceFiles) {
        try {
          const fileIssues = await this.scanFile(filePath, codebase);
          issues.push(...fileIssues);
        } catch (error) {
          issues.push({
            type: 'file-not-found',
            severity: 'warning',
            message: `Failed to scan file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            location: filePath,
            suggestion: 'Check if file is readable and contains valid code'
          });
        }
      }

      // Post-process to build dependency relationships
      this.buildDependencyGraph(codebase);

    } catch (error) {
      issues.push({
        type: 'file-not-found',
        severity: 'error',
        message: `Failed to scan codebase: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: this.pathResolver.getProjectRoot(),
        suggestion: 'Check project structure and file permissions'
      });
    }

    return { codebase, issues };
  }

  /**
   * Find all source files to scan
   */
  private async findSourceFiles(): Promise<string[]> {
    const projectRoot = this.pathResolver.getProjectRoot();
    
    return await FileUtils.findFiles(
      projectRoot,
      this.config.scanning.includePatterns,
      this.config.scanning.excludePatterns
    );
  }

  /**
   * Scan a single file for components, APIs, and imports
   */
  private async scanFile(filePath: string, codebase: ParsedCodebase): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    
    // Check if file extension is supported
    const extension = FileUtils.getExtension(filePath);
    if (!this.config.scanning.fileExtensions.includes(extension)) {
      return issues; // Skip unsupported files
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      
      // Extract components
      const componentInfo = this.extractComponentInfo(content, filePath);
      if (componentInfo) {
        codebase.components.set(filePath, componentInfo);
      }

      // Extract API endpoints (for server files)
      const apiInfo = this.extractApiInfo(content, filePath);
      apiInfo.forEach((api, endpoint) => {
        codebase.apis.set(endpoint, api);
      });

      // Extract imports for dependency tracking
      const imports = this.extractImports(content, filePath);
      if (componentInfo) {
        componentInfo.imports = imports;
      }

    } catch (error) {
      issues.push({
        type: 'file-not-found',
        severity: 'warning',
        message: `Could not read file content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: filePath,
        suggestion: 'Check file encoding and permissions'
      });
    }

    return issues;
  }

  /**
   * Extract component information from file content
   */
  private extractComponentInfo(content: string, filePath: string): ComponentInfo | null {
    const exports: string[] = [];
    const componentType = this.determineComponentType(content, filePath);

    // Extract named exports
    const namedExportRegex = /export\s+(?:const|function|class)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    // Extract default export
    const defaultExportMatch = content.match(/export\s+default\s+(\w+)/);
    if (defaultExportMatch) {
      exports.push('default');
    }

    // Extract React component exports
    const reactComponentRegex = /export\s+(?:const|function)\s+(\w+)\s*[=:][^{]*(?:React\.FC|FunctionComponent|ComponentType)/g;
    while ((match = reactComponentRegex.exec(content)) !== null) {
      if (!exports.includes(match[1])) {
        exports.push(match[1]);
      }
    }

    // Only return component info if exports were found
    if (exports.length === 0) {
      return null;
    }

    return {
      filePath,
      exports,
      imports: [], // Will be populated later
      type: componentType
    };
  }

  /**
   * Determine the type of component based on file content and path
   */
  private determineComponentType(content: string, filePath: string): 'component' | 'hook' | 'service' | 'utility' {
    const fileName = filePath.toLowerCase();
    
    // Check for hooks (use prefix or hooks directory)
    if (fileName.includes('hook') || fileName.includes('/hooks/') || content.includes('useState') || content.includes('useEffect')) {
      return 'hook';
    }

    // Check for services
    if (fileName.includes('service') || fileName.includes('/services/') || fileName.includes('api') || fileName.includes('/api/')) {
      return 'service';
    }

    // Check for React components
    if (content.includes('React') || content.includes('jsx') || content.includes('tsx') || 
        content.includes('return (') && content.includes('<')) {
      return 'component';
    }

    // Default to utility
    return 'utility';
  }

  /**
   * Extract API endpoint information from server files
   */
  private extractApiInfo(content: string, filePath: string): Map<string, ApiInfo> {
    const apis = new Map<string, ApiInfo>();

    // Skip if not a server file
    if (!filePath.includes('server') && !filePath.includes('api') && !filePath.includes('routes')) {
      return apis;
    }

    // Extract Express route definitions
    const routeRegex = /(?:router|app)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/g;
    let match;
    
    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const path = match[2];
      const handler = match[3].trim();
      const endpoint = `${method} ${path}`;

      apis.set(endpoint, {
        endpoint,
        method,
        handlerFile: filePath,
        handlerFunction: handler
      });
    }

    // Extract route registrations (for modular routes)
    const registerRegex = /registerRoutes?\s*\(\s*app\s*\)/g;
    if (registerRegex.test(content)) {
      // This file registers routes - mark it as a route handler
      const endpoint = `ROUTES ${filePath}`;
      apis.set(endpoint, {
        endpoint,
        method: 'ROUTES',
        handlerFile: filePath
      });
    }

    return apis;
  }

  /**
   * Extract import statements from file content
   */
  private extractImports(content: string, filePath: string): ImportInfo[] {
    const imports: ImportInfo[] = [];

    // Extract ES6 imports
    const importRegex = /import\s+(?:(?:(\w+)|{([^}]+)}|\*\s+as\s+(\w+))\s+from\s+)?['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const defaultImport = match[1];
      const namedImports = match[2];
      const namespaceImport = match[3];
      const module = match[4];

      const specifiers: string[] = [];
      let isDefault = false;

      if (defaultImport) {
        specifiers.push(defaultImport);
        isDefault = true;
      }

      if (namedImports) {
        const named = namedImports.split(',').map(s => s.trim()).filter(s => s);
        specifiers.push(...named);
      }

      if (namespaceImport) {
        specifiers.push(namespaceImport);
      }

      imports.push({
        module,
        specifiers,
        isDefault
      });
    }

    // Extract require statements (CommonJS)
    const requireRegex = /(?:const|let|var)\s+(?:(\w+)|{([^}]+)})\s*=\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    
    while ((match = requireRegex.exec(content)) !== null) {
      const defaultImport = match[1];
      const namedImports = match[2];
      const module = match[3];

      const specifiers: string[] = [];
      
      if (defaultImport) {
        specifiers.push(defaultImport);
      }

      if (namedImports) {
        const named = namedImports.split(',').map(s => s.trim()).filter(s => s);
        specifiers.push(...named);
      }

      imports.push({
        module,
        specifiers,
        isDefault: !!defaultImport
      });
    }

    return imports;
  }

  /**
   * Build dependency graph from scanned components and imports
   */
  private buildDependencyGraph(codebase: ParsedCodebase): void {
    // Add nodes for all components
    for (const [filePath, componentInfo] of codebase.components) {
      codebase.dependencies.nodes.set(filePath, {
        id: filePath,
        type: 'component',
        metadata: {
          exports: componentInfo.exports,
          componentType: componentInfo.type
        }
      });
    }

    // Add nodes for all APIs
    for (const [endpoint, apiInfo] of codebase.apis) {
      codebase.dependencies.nodes.set(endpoint, {
        id: endpoint,
        type: 'api',
        metadata: {
          method: apiInfo.method,
          handlerFile: apiInfo.handlerFile
        }
      });
    }

    // Build edges from imports
    for (const [filePath, componentInfo] of codebase.components) {
      for (const importInfo of componentInfo.imports) {
        // Resolve relative imports to absolute paths
        if (importInfo.module.startsWith('./') || importInfo.module.startsWith('../')) {
          try {
            const resolvedPath = this.pathResolver.resolveSourceFile(
              this.pathResolver.filePathToImportPath(importInfo.module, filePath)
            );
            
            if (codebase.dependencies.nodes.has(resolvedPath)) {
              codebase.dependencies.edges.push({
                from: filePath,
                to: resolvedPath,
                type: 'import'
              });
            }
          } catch {
            // Skip unresolvable imports
          }
        }
      }
    }
  }

  /**
   * Find components by name in the scanned codebase
   */
  findComponentByName(codebase: ParsedCodebase, componentName: string): ComponentInfo[] {
    const matches: ComponentInfo[] = [];
    
    for (const componentInfo of codebase.components.values()) {
      if (componentInfo.exports.includes(componentName) || 
          componentInfo.exports.includes('default') && 
          componentInfo.filePath.includes(componentName)) {
        matches.push(componentInfo);
      }
    }
    
    return matches;
  }

  /**
   * Find API handlers by endpoint
   */
  findApiByEndpoint(codebase: ParsedCodebase, method: string, path: string): ApiInfo | null {
    const endpoint = `${method.toUpperCase()} ${path}`;
    return codebase.apis.get(endpoint) || null;
  }
}