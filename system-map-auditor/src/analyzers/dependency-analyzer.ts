import {
  CircularDependency,
  DependencyAnalysis,
  DependencyMetrics,
  OptimizationSuggestion,
  PerformanceMetrics,
  BundleSizeMetrics,
  LoadingMetrics,
  ComplexityMetrics,
  ValidationIssue,
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
  ParsedCodebase
} from '../core/types.js';

export class DependencyAnalyzer {
  private dependencyGraph: DependencyGraph;
  private circularDependencies: CircularDependency[] = [];
  private performanceCache: Map<string, PerformanceMetrics> = new Map();

  constructor(private codebase: ParsedCodebase) {
    this.dependencyGraph = codebase.dependencies;
    this.analyzeDependencies();
  }

  /**
   * Detects circular dependencies in the dependency graph
   */
  public detectCircularDependencies(): CircularDependency[] {
    if (this.circularDependencies.length > 0) {
      return this.circularDependencies;
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const paths = new Map<string, string[]>();

    for (const [nodeId] of this.dependencyGraph.nodes) {
      if (!visited.has(nodeId)) {
        this.detectCircularDFS(nodeId, visited, recursionStack, paths, []);
      }
    }

    return this.circularDependencies;
  }

  /**
   * Analyzes dependency depth for a specific component
   */
  public analyzeDependencyDepth(component: string): DependencyAnalysis {
    const dependencies = this.getDependencies(component);
    const dependents = this.getDependents(component);
    const circularPaths = this.findCircularPaths(component);
    const depth = this.calculateMaxDepth(component);

    const metrics: DependencyMetrics = {
      totalDependencies: dependencies.length,
      directDependencies: this.getDirectDependencies(component).length,
      maxDepth: depth,
      circularCount: circularPaths.length,
      complexityScore: this.calculateComplexityScore(dependencies, circularPaths, depth)
    };

    return {
      component,
      depth,
      dependencies,
      dependents,
      circularPaths,
      metrics
    };
  }

  /**
   * Finds shortest dependency path between two components
   */
  public findShortestDependencyPath(from: string, to: string): string[] {
    if (!this.dependencyGraph.nodes.has(from) || !this.dependencyGraph.nodes.has(to)) {
      return [];
    }

    const queue: Array<{node: string; path: string[]}> = [{node: from, path: [from]}];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const {node, path} = queue.shift()!;
      
      if (node === to) {
        return path;
      }

      if (visited.has(node)) {
        continue;
      }
      visited.add(node);

      const neighbors = this.getDirectDependencies(node);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({node: neighbor, path: [...path, neighbor]});
        }
      }
    }

    return [];
  }

  /**
   * Suggests dependency optimizations
   */
  public suggestDependencyOptimizations(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze circular dependencies
    const circularDeps = this.detectCircularDependencies();
    for (const circular of circularDeps) {
      suggestions.push({
        type: 'break-circular',
        target: circular.path.join(' → '),
        description: `Break circular dependency by ${this.getCircularBreakSuggestion(circular)}`,
        impact: circular.severity === 'error' ? 'high' : 'medium',
        effort: 'medium'
      });
    }

    // Analyze heavy dependencies
    const heavyDependencies = this.findHeavyDependencies();
    for (const heavy of heavyDependencies) {
      suggestions.push({
        type: 'lazy-load',
        target: heavy.component,
        description: `Consider lazy loading "${heavy.component}" (${heavy.dependencyCount} dependencies)`,
        impact: 'medium',
        effort: 'low'
      });
    }

    // Analyze deep dependency chains
    const deepChains = this.findDeepDependencyChains();
    for (const chain of deepChains) {
      suggestions.push({
        type: 'reduce-dependencies',
        target: chain.component,
        description: `Reduce dependency depth for "${chain.component}" (depth: ${chain.depth})`,
        impact: 'medium',
        effort: 'high'
      });
    }

    // Analyze code splitting opportunities
    const splitOpportunities = this.findCodeSplitOpportunities();
    for (const opportunity of splitOpportunities) {
      suggestions.push({
        type: 'code-split',
        target: opportunity.target,
        description: `Code split large component group: ${opportunity.components.join(', ')}`,
        impact: 'high',
        effort: 'medium'
      });
    }

    return suggestions;
  }

  /**
   * Analyzes performance impact of dependencies
   */
  public analyzePerformanceImpact(): PerformanceMetrics {
    const bundleSize = this.analyzeBundleSize();
    const loadingMetrics = this.analyzeLoadingMetrics();
    const complexityMetrics = this.analyzeComplexityMetrics();

    return {
      bundleSize,
      loadingMetrics,
      complexityMetrics
    };
  }

  /**
   * Validates architecture patterns
   */
  public validateArchitecturePatterns(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check layer separation
    const layerViolations = this.checkLayerSeparation();
    issues.push(...layerViolations);

    // Check unidirectional data flow
    const dataFlowViolations = this.checkUnidirectionalDataFlow();
    issues.push(...dataFlowViolations);

    // Check single responsibility
    const responsibilityViolations = this.checkSingleResponsibility();
    issues.push(...responsibilityViolations);

    // Check interface segregation
    const interfaceViolations = this.checkInterfaceSegregation();
    issues.push(...interfaceViolations);

    return issues;
  }

  /**
   * Calculates scalability metrics
   */
  public calculateScalabilityMetrics(): {
    featureComplexity: Map<string, number>;
    componentReusability: Map<string, number>;
    apiEfficiency: Map<string, number>;
    overallScalabilityScore: number;
  } {
    const featureComplexity = this.calculateFeatureComplexity();
    const componentReusability = this.calculateComponentReusability();
    const apiEfficiency = this.calculateApiEfficiency();
    const overallScalabilityScore = this.calculateOverallScalabilityScore(
      featureComplexity,
      componentReusability,
      apiEfficiency
    );

    return {
      featureComplexity,
      componentReusability,
      apiEfficiency,
      overallScalabilityScore
    };
  }

  // Private helper methods

  private analyzeDependencies(): void {
    // Build comprehensive dependency analysis
    this.detectCircularDependencies();
    this.calculatePerformanceMetrics();
  }

  private detectCircularDFS(
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    paths: Map<string, string[]>,
    currentPath: string[]
  ): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    currentPath.push(nodeId);

    const neighbors = this.getDirectDependencies(nodeId);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.detectCircularDFS(neighbor, visited, recursionStack, paths, [...currentPath]);
      } else if (recursionStack.has(neighbor)) {
        // Found circular dependency
        const circularStart = currentPath.indexOf(neighbor);
        const circularPath = currentPath.slice(circularStart);
        circularPath.push(neighbor); // Complete the circle

        const edgeType = this.getEdgeType(nodeId, neighbor);
        this.circularDependencies.push({
          path: circularPath,
          type: edgeType,
          severity: this.getCircularSeverity(circularPath, edgeType),
          suggestion: this.getCircularBreakSuggestion({
            path: circularPath,
            type: edgeType,
            severity: 'error'
          })
        });
      }
    }

    recursionStack.delete(nodeId);
    currentPath.pop();
  }

  private getDependencies(component: string): string[] {
    const dependencies: string[] = [];
    const visited = new Set<string>();
    
    this.collectDependenciesRecursive(component, dependencies, visited);
    return dependencies;
  }

  private collectDependenciesRecursive(node: string, dependencies: string[], visited: Set<string>): void {
    if (visited.has(node)) return;
    visited.add(node);

    const directDeps = this.getDirectDependencies(node);
    for (const dep of directDeps) {
      if (!dependencies.includes(dep)) {
        dependencies.push(dep);
      }
      this.collectDependenciesRecursive(dep, dependencies, visited);
    }
  }

  private getDependents(component: string): string[] {
    const dependents: string[] = [];
    
    for (const edge of this.dependencyGraph.edges) {
      if (edge.to === component && !dependents.includes(edge.from)) {
        dependents.push(edge.from);
      }
    }
    
    return dependents;
  }

  private getDirectDependencies(component: string): string[] {
    return this.dependencyGraph.edges
      .filter(edge => edge.from === component)
      .map(edge => edge.to);
  }

  private findCircularPaths(component: string): string[][] {
    return this.circularDependencies
      .filter(circular => circular.path.includes(component))
      .map(circular => circular.path);
  }

  private calculateMaxDepth(component: string, visited = new Set<string>()): number {
    if (visited.has(component)) return 0;
    visited.add(component);

    const dependencies = this.getDirectDependencies(component);
    if (dependencies.length === 0) return 1;

    const depths = dependencies.map(dep => this.calculateMaxDepth(dep, new Set(visited)));
    return 1 + Math.max(...depths);
  }

  private calculateComplexityScore(dependencies: string[], circularPaths: string[][], depth: number): number {
    const dependencyWeight = dependencies.length * 0.3;
    const circularWeight = circularPaths.length * 2.0;
    const depthWeight = depth * 0.5;
    
    return Math.round(dependencyWeight + circularWeight + depthWeight);
  }

  private getEdgeType(from: string, to: string): 'import' | 'api-call' | 'component-usage' {
    const edge = this.dependencyGraph.edges.find(e => e.from === from && e.to === to);
    return edge?.type || 'import';
  }

  private getCircularSeverity(path: string[], type: string): 'error' | 'warning' {
    if (type === 'import' && path.length <= 3) return 'error';
    return 'warning';
  }

  private getCircularBreakSuggestion(circular: CircularDependency): string {
    switch (circular.type) {
      case 'import':
        return 'introducing an interface or moving shared logic to a separate module';
      case 'component-usage':
        return 'using dependency injection or event-driven communication';
      case 'api-call':
        return 'restructuring API calls or using async patterns';
      default:
        return 'refactoring the dependency structure';
    }
  }

  private findHeavyDependencies(): Array<{component: string; dependencyCount: number}> {
    const heavyThreshold = 10;
    const heavy: Array<{component: string; dependencyCount: number}> = [];

    for (const [nodeId] of this.dependencyGraph.nodes) {
      const depCount = this.getDependencies(nodeId).length;
      if (depCount > heavyThreshold) {
        heavy.push({ component: nodeId, dependencyCount: depCount });
      }
    }

    return heavy.sort((a, b) => b.dependencyCount - a.dependencyCount);
  }

  private findDeepDependencyChains(): Array<{component: string; depth: number}> {
    const deepThreshold = 5;
    const deep: Array<{component: string; depth: number}> = [];

    for (const [nodeId] of this.dependencyGraph.nodes) {
      const depth = this.calculateMaxDepth(nodeId);
      if (depth > deepThreshold) {
        deep.push({ component: nodeId, depth });
      }
    }

    return deep.sort((a, b) => b.depth - a.depth);
  }

  private findCodeSplitOpportunities(): Array<{target: string; components: string[]}> {
    // Find groups of highly connected components that could be split
    const opportunities: Array<{target: string; components: string[]}> = [];
    const componentGroups = this.findComponentClusters();

    for (const [groupName, components] of componentGroups) {
      if (components.size > 5) {
        opportunities.push({
          target: groupName,
          components: Array.from(components)
        });
      }
    }

    return opportunities;
  }

  private findComponentClusters(): Map<string, Set<string>> {
    const clusters = new Map<string, Set<string>>();
    const visited = new Set<string>();

    for (const [nodeId] of this.dependencyGraph.nodes) {
      if (!visited.has(nodeId)) {
        const cluster = new Set<string>();
        this.collectCluster(nodeId, cluster, visited);
        
        if (cluster.size > 1) {
          clusters.set(`cluster-${clusters.size}`, cluster);
        }
      }
    }

    return clusters;
  }

  private collectCluster(nodeId: string, cluster: Set<string>, visited: Set<string>): void {
    if (visited.has(nodeId)) return;
    
    visited.add(nodeId);
    cluster.add(nodeId);

    const neighbors = [
      ...this.getDirectDependencies(nodeId),
      ...this.getDependents(nodeId)
    ];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.collectCluster(neighbor, cluster, visited);
      }
    }
  }

  private analyzeBundleSize(): BundleSizeMetrics {
    const componentSizes = new Map<string, number>();
    let totalSize = 0;

    // Estimate component sizes based on dependencies
    for (const [componentName] of this.codebase.components) {
      const depCount = this.getDependencies(componentName).length;
      const estimatedSize = this.estimateComponentSize(componentName, depCount);
      componentSizes.set(componentName, estimatedSize);
      totalSize += estimatedSize;
    }

    const largestComponents = Array.from(componentSizes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([component, size]) => ({ component, size }));

    return {
      totalSize,
      componentSizes,
      largestComponents,
      unusedCode: this.estimateUnusedCode()
    };
  }

  private analyzeLoadingMetrics(): LoadingMetrics {
    const criticalPath = this.findCriticalLoadingPath();
    const loadingTime = this.estimateLoadingTime(criticalPath);
    const lazyLoadableComponents = this.findLazyLoadableComponents();
    const preloadCandidates = this.findPreloadCandidates();

    return {
      criticalPath,
      loadingTime,
      lazyLoadableComponents,
      preloadCandidates
    };
  }

  private analyzeComplexityMetrics(): ComplexityMetrics {
    let totalCognitive = 0;
    let totalCyclomatic = 0;
    let componentCount = 0;

    for (const [componentName] of this.codebase.components) {
      const cognitive = this.calculateCognitiveComplexity(componentName);
      const cyclomatic = this.calculateCyclomaticComplexity(componentName);
      
      totalCognitive += cognitive;
      totalCyclomatic += cyclomatic;
      componentCount++;
    }

    const avgCognitive = componentCount > 0 ? totalCognitive / componentCount : 0;
    const avgCyclomatic = componentCount > 0 ? totalCyclomatic / componentCount : 0;

    return {
      cognitiveComplexity: Math.round(avgCognitive),
      cyclomaticComplexity: Math.round(avgCyclomatic),
      maintainabilityIndex: this.calculateMaintainabilityIndex(avgCognitive, avgCyclomatic),
      technicalDebt: this.calculateTechnicalDebt()
    };
  }

  private checkLayerSeparation(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Check for UI components calling database directly
    for (const [componentName, componentInfo] of this.codebase.components) {
      if (this.isUIComponent(componentName) && this.hasDirectDatabaseAccess(componentInfo)) {
        issues.push({
          type: 'architecture-violation',
          severity: 'error',
          message: `UI component "${componentName}" has direct database access`,
          location: `components.${componentName}`,
          suggestion: 'Move database access to service layer and use API calls from UI'
        });
      }
    }

    return issues;
  }

  private checkUnidirectionalDataFlow(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Check for bidirectional data flow violations
    const bidirectionalEdges = this.findBidirectionalEdges();
    for (const {from, to} of bidirectionalEdges) {
      issues.push({
        type: 'architecture-violation',
        severity: 'warning',
        message: `Bidirectional dependency between "${from}" and "${to}"`,
        location: `dependencies.${from}-${to}`,
        suggestion: 'Implement unidirectional data flow using state management or event system'
      });
    }

    return issues;
  }

  private checkSingleResponsibility(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    for (const [componentName] of this.codebase.components) {
      const responsibilities = this.analyzeComponentResponsibilities(componentName);
      if (responsibilities.length > 3) {
        issues.push({
          type: 'architecture-violation',
          severity: 'warning',
          message: `Component "${componentName}" has multiple responsibilities: ${responsibilities.join(', ')}`,
          location: `components.${componentName}`,
          suggestion: 'Split component into smaller, single-responsibility components'
        });
      }
    }

    return issues;
  }

  private checkInterfaceSegregation(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Check for large interfaces that could be segregated
    for (const [componentName, componentInfo] of this.codebase.components) {
      const exportCount = componentInfo.exports.length;
      if (exportCount > 10) {
        issues.push({
          type: 'architecture-violation',
          severity: 'info',
          message: `Component "${componentName}" exports many functions (${exportCount})`,
          location: `components.${componentName}`,
          suggestion: 'Consider splitting into smaller, more focused interfaces'
        });
      }
    }

    return issues;
  }

  private calculateFeatureComplexity(): Map<string, number> {
    // Calculate complexity metrics for features
    return new Map();
  }

  private calculateComponentReusability(): Map<string, number> {
    const reusability = new Map<string, number>();
    
    for (const [componentName] of this.codebase.components) {
      const usageCount = this.getDependents(componentName).length;
      const dependencyCount = this.getDependencies(componentName).length;
      
      // Higher reusability = more usage, fewer dependencies
      const score = usageCount > 0 ? (usageCount * 10) / (dependencyCount + 1) : 0;
      reusability.set(componentName, Math.round(score));
    }
    
    return reusability;
  }

  private calculateApiEfficiency(): Map<string, number> {
    const efficiency = new Map<string, number>();
    
    for (const [apiName] of this.codebase.apis) {
      // Simple efficiency metric based on usage
      const usageCount = this.getApiUsageCount(apiName);
      efficiency.set(apiName, usageCount);
    }
    
    return efficiency;
  }

  private calculateOverallScalabilityScore(
    featureComplexity: Map<string, number>,
    componentReusability: Map<string, number>,
    apiEfficiency: Map<string, number>
  ): number {
    const avgReusability = this.calculateMapAverage(componentReusability);
    const avgEfficiency = this.calculateMapAverage(apiEfficiency);
    const circularPenalty = this.circularDependencies.length * 5;
    
    return Math.max(0, Math.round(avgReusability + avgEfficiency - circularPenalty));
  }

  private calculatePerformanceMetrics(): void {
    // Cache performance metrics for later use
    const metrics = this.analyzePerformanceImpact();
    this.performanceCache.set('global', metrics);
  }

  private estimateComponentSize(componentName: string, depCount: number): number {
    // Estimate component size based on dependencies and type
    const baseSize = 1000; // Base size in bytes
    const depMultiplier = 500; // Size per dependency
    return baseSize + (depCount * depMultiplier);
  }

  private estimateUnusedCode(): number {
    // Estimate unused code based on component usage
    let unusedSize = 0;
    
    for (const [componentName] of this.codebase.components) {
      const isUsed = this.getDependents(componentName).length > 0;
      if (!isUsed) {
        unusedSize += this.estimateComponentSize(componentName, 0);
      }
    }
    
    return unusedSize;
  }

  private findCriticalLoadingPath(): string[] {
    // Find the longest dependency chain as critical path
    let longestPath: string[] = [];
    
    for (const [nodeId] of this.dependencyGraph.nodes) {
      const path = this.findLongestPathFrom(nodeId);
      if (path.length > longestPath.length) {
        longestPath = path;
      }
    }
    
    return longestPath;
  }

  private findLongestPathFrom(start: string, visited = new Set<string>()): string[] {
    if (visited.has(start)) return [start];
    
    visited.add(start);
    const dependencies = this.getDirectDependencies(start);
    
    if (dependencies.length === 0) return [start];
    
    const paths = dependencies.map(dep => this.findLongestPathFrom(dep, new Set(visited)));
    const longestSubPath = paths.reduce((longest, current) => 
      current.length > longest.length ? current : longest, []);
    
    return [start, ...longestSubPath];
  }

  private estimateLoadingTime(criticalPath: string[]): number {
    // Estimate loading time based on critical path length
    const baseTime = 100; // Base loading time in ms
    const pathMultiplier = 50; // Time per dependency in path
    return baseTime + (criticalPath.length * pathMultiplier);
  }

  private findLazyLoadableComponents(): string[] {
    return Array.from(this.codebase.components.keys())
      .filter(componentName => {
        const dependents = this.getDependents(componentName);
        const isLeafComponent = dependents.length === 0;
        const isHeavy = this.getDependencies(componentName).length > 5;
        return isLeafComponent && isHeavy;
      });
  }

  private findPreloadCandidates(): string[] {
    return Array.from(this.codebase.components.keys())
      .filter(componentName => {
        const dependents = this.getDependents(componentName);
        return dependents.length > 3; // Frequently used components
      })
      .slice(0, 5); // Top 5 candidates
  }

  private calculateCognitiveComplexity(componentName: string): number {
    // Simplified cognitive complexity calculation
    const dependencies = this.getDependencies(componentName);
    const circularPaths = this.findCircularPaths(componentName);
    return dependencies.length + (circularPaths.length * 3);
  }

  private calculateCyclomaticComplexity(componentName: string): number {
    // Simplified cyclomatic complexity calculation
    const dependencies = this.getDirectDependencies(componentName);
    return dependencies.length + 1;
  }

  private calculateMaintainabilityIndex(cognitive: number, cyclomatic: number): number {
    // Simplified maintainability index (higher is better)
    const complexity = cognitive + cyclomatic;
    return Math.max(0, Math.round(100 - complexity));
  }

  private calculateTechnicalDebt(): number {
    // Calculate technical debt based on circular dependencies and violations
    const circularDebt = this.circularDependencies.length * 10;
    const complexityDebt = this.getHighComplexityComponents().length * 5;
    return circularDebt + complexityDebt;
  }

  private isUIComponent(componentName: string): boolean {
    return componentName.toLowerCase().includes('component') || 
           componentName.toLowerCase().includes('ui') ||
           componentName.toLowerCase().includes('view');
  }

  private hasDirectDatabaseAccess(componentInfo: any): boolean {
    return componentInfo.imports.some((imp: any) => 
      imp.module.includes('database') || 
      imp.module.includes('db') ||
      imp.module.includes('sql')
    );
  }

  private findBidirectionalEdges(): Array<{from: string; to: string}> {
    const bidirectional: Array<{from: string; to: string}> = [];
    const edgeMap = new Set<string>();
    
    for (const edge of this.dependencyGraph.edges) {
      const reverseKey = `${edge.to}->${edge.from}`;
      const forwardKey = `${edge.from}->${edge.to}`;
      
      if (edgeMap.has(reverseKey)) {
        bidirectional.push({ from: edge.from, to: edge.to });
      }
      edgeMap.add(forwardKey);
    }
    
    return bidirectional;
  }

  private analyzeComponentResponsibilities(componentName: string): string[] {
    // Analyze component to determine its responsibilities
    const responsibilities: string[] = [];
    const componentInfo = this.codebase.components.get(componentName);
    
    if (!componentInfo) return responsibilities;
    
    // Check imports to infer responsibilities
    for (const imp of componentInfo.imports) {
      if (imp.module.includes('api')) responsibilities.push('api-communication');
      if (imp.module.includes('state')) responsibilities.push('state-management');
      if (imp.module.includes('ui')) responsibilities.push('ui-rendering');
      if (imp.module.includes('validation')) responsibilities.push('data-validation');
    }
    
    return [...new Set(responsibilities)]; // Remove duplicates
  }

  private getApiUsageCount(apiName: string): number {
    // Count how many components use this API
    let count = 0;
    for (const [_, componentInfo] of this.codebase.components) {
      const usesApi = componentInfo.imports.some(imp => imp.module.includes(apiName));
      if (usesApi) count++;
    }
    return count;
  }

  private calculateMapAverage(map: Map<string, number>): number {
    if (map.size === 0) return 0;
    const sum = Array.from(map.values()).reduce((acc, val) => acc + val, 0);
    return sum / map.size;
  }

  private getHighComplexityComponents(): string[] {
    return Array.from(this.codebase.components.keys())
      .filter(componentName => {
        const complexity = this.calculateCognitiveComplexity(componentName);
        return complexity > 10;
      });
  }
}