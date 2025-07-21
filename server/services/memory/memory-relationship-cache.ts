/**
 * Cache management for Memory Relationship Engine
 * @used-by server/services/memory-relationship-engine
 */

import { MemoryRelationship, AtomicFact, SemanticCluster } from './memory-relationship-types';

/**
 * Cache manager for memory relationship operations
 */
export class MemoryRelationshipCache {
  private relationshipCache = new Map<string, MemoryRelationship[]>();
  private atomicFactCache = new Map<string, AtomicFact[]>();
  private clusterCache = new Map<string, SemanticCluster>();
  private cacheTimestamps = new Map<string, number>();
  
  // Performance optimization caches
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Check if cache entry is still valid
   */
  isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    
    return (Date.now() - timestamp) < this.CACHE_TTL;
  }

  /**
   * Relationship cache operations
   */
  getRelationships(cacheKey: string): MemoryRelationship[] | undefined {
    if (this.relationshipCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return this.relationshipCache.get(cacheKey);
    }
    return undefined;
  }

  setRelationships(cacheKey: string, relationships: MemoryRelationship[]): void {
    this.relationshipCache.set(cacheKey, relationships);
    this.cacheTimestamps.set(cacheKey, Date.now());
  }

  /**
   * Atomic fact cache operations
   */
  getAtomicFacts(cacheKey: string): AtomicFact[] | undefined {
    if (this.atomicFactCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return this.atomicFactCache.get(cacheKey);
    }
    return undefined;
  }

  setAtomicFacts(cacheKey: string, facts: AtomicFact[]): void {
    this.atomicFactCache.set(cacheKey, facts);
    this.cacheTimestamps.set(cacheKey, Date.now());
  }

  /**
   * Cluster cache operations
   */
  getCluster(cacheKey: string): SemanticCluster | undefined {
    if (this.clusterCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return this.clusterCache.get(cacheKey);
    }
    return undefined;
  }

  setCluster(cacheKey: string, cluster: SemanticCluster): void {
    this.clusterCache.set(cacheKey, cluster);
    this.cacheTimestamps.set(cacheKey, Date.now());
  }

  /**
   * Performance monitoring
   */
  getPerformanceMetrics(): any {
    return {
      relationshipCacheSize: this.relationshipCache.size,
      atomicFactCacheSize: this.atomicFactCache.size,
      clusterCacheSize: this.clusterCache.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear all caches (for testing and maintenance)
   */
  clearCaches(): void {
    this.relationshipCache.clear();
    this.atomicFactCache.clear();
    this.clusterCache.clear();
    this.cacheTimestamps.clear();
  }
}