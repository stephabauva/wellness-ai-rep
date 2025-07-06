import { LRUCache } from 'lru-cache';
import { MemoryEntry, User, ChatMessage, HealthData, ConnectedDevice, File } from '@shared/schema';

// Cache configuration interface
interface CacheConfig {
  maxItems: number;
  ttlMs: number;
  staleWhileRevalidateMs?: number;
}

// Cache categories with different TTL strategies
const CACHE_CONFIGS = {
  userSettings: { maxItems: 1000, ttlMs: 30 * 60 * 1000 }, // 30 minutes
  contextualMemories: { maxItems: 5000, ttlMs: 60 * 60 * 1000 }, // 1 hour
  aiResponses: { maxItems: 2000, ttlMs: 24 * 60 * 60 * 1000 }, // 24 hours
  fileMetadata: { maxItems: 10000, ttlMs: 2 * 60 * 60 * 1000 }, // 2 hours
  fileThumbnails: { maxItems: 5000, ttlMs: 24 * 60 * 60 * 1000 }, // 24 hours
  healthData: { maxItems: 3000, ttlMs: 15 * 60 * 1000 }, // 15 minutes
  deviceSettings: { maxItems: 1000, ttlMs: 30 * 60 * 1000 }, // 30 minutes
  embeddings: { maxItems: 10000, ttlMs: 24 * 60 * 60 * 1000 }, // 24 hours
} as const;

// Cache key generators
export class CacheKeys {
  static userSettings(userId: number): string {
    return `user:settings:${userId}`;
  }
  
  static contextualMemories(userId: number, conversationId?: string): string {
    return conversationId 
      ? `memories:user:${userId}:conv:${conversationId}`
      : `memories:user:${userId}`;
  }
  
  static aiResponse(prompt: string, model: string, userId: number): string {
    // Create a hash-like key from prompt to avoid very long keys
    const promptHash = Buffer.from(prompt).toString('base64').slice(0, 32);
    return `ai:response:${model}:${userId}:${promptHash}`;
  }
  
  static fileMetadata(fileId: string): string {
    return `file:metadata:${fileId}`;
  }
  
  static fileThumbnail(fileId: string, size?: string): string {
    return `file:thumbnail:${fileId}${size ? `:${size}` : ''}`;
  }
  
  static healthData(userId: number, timeRange: string): string {
    return `health:${userId}:${timeRange}`;
  }
  
  static deviceSettings(deviceId: number): string {
    return `device:settings:${deviceId}`;
  }
  
  static embedding(text: string): string {
    const textHash = Buffer.from(text).toString('base64').slice(0, 32);
    return `embedding:${textHash}`;
  }
  
  static memorySearch(userId: number, query: string, limit: number): string {
    const queryHash = Buffer.from(query).toString('base64').slice(0, 20);
    return `memory:search:${userId}:${queryHash}:${limit}`;
  }
}

// Cached data types
interface CachedAiResponse {
  response: string;
  metadata: {
    model: string;
    timestamp: number;
    tokenCount?: number;
  };
}

interface CachedFileMetadata {
  metadata: File;
  stats: {
    size: number;
    lastModified: number;
  };
}

interface CachedThumbnail {
  data: Buffer;
  mimeType: string;
  dimensions: { width: number; height: number };
}

interface CachedEmbedding {
  embedding: number[];
  model: string;
  timestamp: number;
}

export class IntelligentCacheService {
  private caches: Map<string, LRUCache<string, any>>;
  private hitCounts: Map<string, number>;
  private missCounts: Map<string, number>;
  private static instance: IntelligentCacheService;

  private constructor() {
    this.caches = new Map();
    this.hitCounts = new Map();
    this.missCounts = new Map();
    this.initializeCaches();
  }

  static getInstance(): IntelligentCacheService {
    if (!IntelligentCacheService.instance) {
      IntelligentCacheService.instance = new IntelligentCacheService();
    }
    return IntelligentCacheService.instance;
  }

  private initializeCaches(): void {
    Object.entries(CACHE_CONFIGS).forEach(([name, config]) => {
      this.caches.set(name, new LRUCache({
        max: config.maxItems,
        ttl: config.ttlMs,
        allowStale: true,
        updateAgeOnGet: true,
        fetchMethod: async (key: string) => {
          // Stale-while-revalidate pattern
          return null; // Let the caller handle the fetch
        }
      }));
      this.hitCounts.set(name, 0);
      this.missCounts.set(name, 0);
    });
  }

  // Generic cache operations
  private getCache(category: keyof typeof CACHE_CONFIGS): LRUCache<string, any> {
    const cache = this.caches.get(category);
    if (!cache) {
      throw new Error(`Cache category '${category}' not found`);
    }
    return cache;
  }

  private recordHit(category: string): void {
    this.hitCounts.set(category, (this.hitCounts.get(category) || 0) + 1);
  }

  private recordMiss(category: string): void {
    this.missCounts.set(category, (this.missCounts.get(category) || 0) + 1);
  }

  // User settings caching
  async getUserSettings(userId: number): Promise<any | null> {
    const cache = this.getCache('userSettings');
    const key = CacheKeys.userSettings(userId);
    const cached = cache.get(key);
    
    if (cached) {
      this.recordHit('userSettings');
      return cached;
    }
    
    this.recordMiss('userSettings');
    return null;
  }

  setUserSettings(userId: number, settings: any): void {
    const cache = this.getCache('userSettings');
    const key = CacheKeys.userSettings(userId);
    cache.set(key, settings);
  }

  // Contextual memories caching
  async getContextualMemories(userId: number, conversationId?: string): Promise<MemoryEntry[] | null> {
    const cache = this.getCache('contextualMemories');
    const key = CacheKeys.contextualMemories(userId, conversationId);
    const cached = cache.get(key);
    
    if (cached) {
      this.recordHit('contextualMemories');
      return cached;
    }
    
    this.recordMiss('contextualMemories');
    return null;
  }

  setContextualMemories(userId: number, memories: MemoryEntry[], conversationId?: string): void {
    const cache = this.getCache('contextualMemories');
    const key = CacheKeys.contextualMemories(userId, conversationId);
    cache.set(key, memories);
  }

  // AI response caching
  async getAiResponse(prompt: string, model: string, userId: number): Promise<CachedAiResponse | null> {
    const cache = this.getCache('aiResponses');
    const key = CacheKeys.aiResponse(prompt, model, userId);
    const cached = cache.get(key);
    
    if (cached) {
      this.recordHit('aiResponses');
      return cached;
    }
    
    this.recordMiss('aiResponses');
    return null;
  }

  setAiResponse(prompt: string, model: string, userId: number, response: string, metadata: any): void {
    const cache = this.getCache('aiResponses');
    const key = CacheKeys.aiResponse(prompt, model, userId);
    const cachedResponse: CachedAiResponse = {
      response,
      metadata: {
        model,
        timestamp: Date.now(),
        ...metadata
      }
    };
    cache.set(key, cachedResponse);
  }

  // File metadata caching
  async getFileMetadata(fileId: string): Promise<CachedFileMetadata | null> {
    const cache = this.getCache('fileMetadata');
    const key = CacheKeys.fileMetadata(fileId);
    const cached = cache.get(key);
    
    if (cached) {
      this.recordHit('fileMetadata');
      return cached;
    }
    
    this.recordMiss('fileMetadata');
    return null;
  }

  setFileMetadata(fileId: string, metadata: File, stats: any): void {
    const cache = this.getCache('fileMetadata');
    const key = CacheKeys.fileMetadata(fileId);
    const cachedMetadata: CachedFileMetadata = {
      metadata,
      stats
    };
    cache.set(key, cachedMetadata);
  }

  // File thumbnail caching
  async getFileThumbnail(fileId: string, size?: string): Promise<CachedThumbnail | null> {
    const cache = this.getCache('fileThumbnails');
    const key = CacheKeys.fileThumbnail(fileId, size);
    const cached = cache.get(key);
    
    if (cached) {
      this.recordHit('fileThumbnails');
      return cached;
    }
    
    this.recordMiss('fileThumbnails');
    return null;
  }

  setFileThumbnail(fileId: string, thumbnailData: Buffer, mimeType: string, dimensions: any, size?: string): void {
    const cache = this.getCache('fileThumbnails');
    const key = CacheKeys.fileThumbnail(fileId, size);
    const cachedThumbnail: CachedThumbnail = {
      data: thumbnailData,
      mimeType,
      dimensions
    };
    cache.set(key, cachedThumbnail);
  }

  // Health data caching
  async getHealthData(userId: number, timeRange: string): Promise<HealthData[] | null> {
    const cache = this.getCache('healthData');
    const key = CacheKeys.healthData(userId, timeRange);
    const cached = cache.get(key);
    
    if (cached) {
      this.recordHit('healthData');
      console.log(`[CacheService] Cache HIT for health data - userId: ${userId}, range: ${timeRange}, count: ${cached.length}`);
      return cached;
    }
    
    this.recordMiss('healthData');
    console.log(`[CacheService] Cache MISS for health data - userId: ${userId}, range: ${timeRange}`);
    return null;
  }

  setHealthData(userId: number, timeRange: string, data: HealthData[]): void {
    const cache = this.getCache('healthData');
    const key = CacheKeys.healthData(userId, timeRange);
    cache.set(key, data);
    console.log(`[CacheService] Cached health data - userId: ${userId}, range: ${timeRange}, count: ${data.length}`);
  }

  // Device settings caching
  async getDeviceSettings(deviceId: number): Promise<ConnectedDevice | null> {
    const cache = this.getCache('deviceSettings');
    const key = CacheKeys.deviceSettings(deviceId);
    const cached = cache.get(key);
    
    if (cached) {
      this.recordHit('deviceSettings');
      return cached;
    }
    
    this.recordMiss('deviceSettings');
    return null;
  }

  setDeviceSettings(deviceId: number, device: ConnectedDevice): void {
    const cache = this.getCache('deviceSettings');
    const key = CacheKeys.deviceSettings(deviceId);
    cache.set(key, device);
  }

  // Embedding caching
  async getEmbedding(text: string): Promise<CachedEmbedding | null> {
    const cache = this.getCache('embeddings');
    const key = CacheKeys.embedding(text);
    const cached = cache.get(key);
    
    if (cached) {
      this.recordHit('embeddings');
      return cached;
    }
    
    this.recordMiss('embeddings');
    return null;
  }

  setEmbedding(text: string, embedding: number[], model: string): void {
    const cache = this.getCache('embeddings');
    const key = CacheKeys.embedding(text);
    const cachedEmbedding: CachedEmbedding = {
      embedding,
      model,
      timestamp: Date.now()
    };
    cache.set(key, cachedEmbedding);
  }

  // Memory search results caching
  async getMemorySearchResults(userId: number, query: string, limit: number): Promise<MemoryEntry[] | null> {
    const cache = this.getCache('contextualMemories');
    const key = CacheKeys.memorySearch(userId, query, limit);
    const cached = cache.get(key);
    
    if (cached) {
      this.recordHit('contextualMemories');
      return cached;
    }
    
    this.recordMiss('contextualMemories');
    return null;
  }

  setMemorySearchResults(userId: number, query: string, limit: number, results: MemoryEntry[]): void {
    const cache = this.getCache('contextualMemories');
    const key = CacheKeys.memorySearch(userId, query, limit);
    cache.set(key, results);
  }

  // Cache invalidation methods
  invalidateUserData(userId: number): void {
    // Specifically invalidate userSettings
    const userSettingsCache = this.getCache('userSettings');
    const userSettingsKey = CacheKeys.userSettings(userId);
    userSettingsCache.delete(userSettingsKey);

    // Invalidate other user-related caches that might use more complex key structures
    const cachesToIterate = ['contextualMemories', 'healthData'] as const; // Ensure type safety
    cachesToIterate.forEach(cacheName => {
      const cache = this.getCache(cacheName);
      const keysToDelete: string[] = [];
      for (const key of cache.keys()) {
        // More specific checks based on how keys are generated for these caches
        if (cacheName === 'contextualMemories' && (key.startsWith(CacheKeys.contextualMemories(userId, '')) || key.startsWith(CacheKeys.memorySearch(userId, '', 0).substring(0, CacheKeys.memorySearch(userId, '', 0).indexOf(':search:'))))) {
          // Check for keys like `memories:user:${userId}` or `memories:user:${userId}:conv:${conversationId}`
          // Also check for `memory:search:${userId}:...`
           if (key.startsWith(`memories:user:${userId}`) || key.startsWith(`memory:search:${userId}`)) {
            keysToDelete.push(key);
          }
        } else if (cacheName === 'healthData' && key.startsWith(`health:${userId}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => cache.delete(key));
    });
  }

  invalidateFileData(fileId: string): void {
    const fileCache = this.getCache('fileMetadata');
    const thumbnailCache = this.getCache('fileThumbnails');
    
    fileCache.delete(CacheKeys.fileMetadata(fileId));
    
    // Clear all thumbnail variants for this file
    const thumbnailKeys: string[] = [];
    thumbnailCache.forEach((_, key) => {
      if (key.startsWith(`file:thumbnail:${fileId}`)) {
        thumbnailKeys.push(key);
      }
    });
    thumbnailKeys.forEach(key => thumbnailCache.delete(key));
  }

  invalidateDeviceData(deviceId: number): void {
    const cache = this.getCache('deviceSettings');
    cache.delete(CacheKeys.deviceSettings(deviceId));
  }

  invalidateMemoriesForConversation(userId: number, conversationId: string): void {
    const cache = this.getCache('contextualMemories');
    const key = CacheKeys.contextualMemories(userId, conversationId);
    cache.delete(key);
    
    // Also clear general user memories as they might be affected
    const generalKey = CacheKeys.contextualMemories(userId);
    cache.delete(generalKey);
  }

  // Tier 2 C: Clear memory search results for user
  clearMemorySearchResults(userId: number): void {
    const cache = this.getCache('contextualMemories');
    const keys = Array.from(cache.keys());
    
    // Remove all memory search result keys for this user
    keys.forEach(key => {
      if (key.includes(`memories:search:${userId}:`) || key.includes(`user:${userId}`)) {
        cache.delete(key);
      }
    });
  }

  // Cache statistics and monitoring
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    Object.keys(CACHE_CONFIGS).forEach(cacheName => {
      const cache = this.caches.get(cacheName);
      const hits = this.hitCounts.get(cacheName) || 0;
      const misses = this.missCounts.get(cacheName) || 0;
      const total = hits + misses;
      
      stats[cacheName] = {
        size: cache?.size || 0,
        maxSize: cache?.max || 0,
        hits,
        misses,
        hitRate: total > 0 ? (hits / total * 100).toFixed(2) + '%' : '0%',
        memoryUsage: cache?.calculatedSize || 0
      };
    });
    
    return stats;
  }

  // Clear user-specific cache data
  clearUserCache(userId: number): void {
    this.invalidateUserData(userId);
  }

  // Clear all caches
  clearAllCaches(): void {
    this.caches.forEach(cache => cache.clear());
    this.hitCounts.clear();
    this.missCounts.clear();
  }

  // Preemptive cache warming
  async warmCache(userId: number): Promise<void> {
    try {
      // This would be called when a user logs in or starts a session
      // Implementation would depend on storage service integration
      console.log(`[CacheService] Warming cache for user ${userId}`);
    } catch (error) {
      console.error('[CacheService] Error warming cache:', error);
    }
  }

  // Cache cleanup
  clearAll(): void {
    this.caches.forEach(cache => cache.clear());
    this.hitCounts.clear();
    this.missCounts.clear();
  }

  clearCategory(category: keyof typeof CACHE_CONFIGS): void {
    const cache = this.getCache(category);
    cache.clear();
    this.hitCounts.set(category, 0);
    this.missCounts.set(category, 0);
  }
}

export const cacheService = IntelligentCacheService.getInstance();