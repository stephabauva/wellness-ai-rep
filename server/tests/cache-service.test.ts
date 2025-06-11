import { describe, it, expect, beforeEach } from 'vitest';
import { cacheService } from '../services/cache-service';

describe('IntelligentCacheService', () => {
  beforeEach(() => {
    // Clear all caches before each test
    cacheService.clearAll();
  });

  describe('User Settings Caching', () => {
    it('should cache and retrieve user settings', async () => {
      const userId = 1;
      const settings = {
        aiProvider: 'openai',
        aiModel: 'gpt-4o',
        transcriptionProvider: 'webspeech',
        preferredLanguage: 'en'
      };

      // First call should return null (cache miss)
      const cached1 = await cacheService.getUserSettings(userId);
      expect(cached1).toBeNull();

      // Set the cache
      cacheService.setUserSettings(userId, settings);

      // Second call should return cached value (cache hit)
      const cached2 = await cacheService.getUserSettings(userId);
      expect(cached2).toEqual(settings);
    });

    it('should invalidate user cache when data changes', async () => {
      const userId = 1;
      const settings = { aiProvider: 'openai' };

      cacheService.setUserSettings(userId, settings);
      
      // Verify cache exists
      const cached = await cacheService.getUserSettings(userId);
      expect(cached).toEqual(settings);

      // Invalidate cache
      cacheService.invalidateUserData(userId);

      // Cache should be cleared
      const cachedAfterInvalidation = await cacheService.getUserSettings(userId);
      expect(cachedAfterInvalidation).toBeNull();
    });
  });

  describe('Embedding Caching', () => {
    it('should cache and retrieve embeddings', async () => {
      const text = 'This is a test message for embedding';
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const model = 'text-embedding-3-small';

      // First call should return null (cache miss)
      const cached1 = await cacheService.getEmbedding(text);
      expect(cached1).toBeNull();

      // Set the cache
      cacheService.setEmbedding(text, embedding, model);

      // Second call should return cached value (cache hit)
      const cached2 = await cacheService.getEmbedding(text);
      expect(cached2).toBeTruthy();
      expect(cached2?.embedding).toEqual(embedding);
      expect(cached2?.model).toBe(model);
    });
  });

  describe('Health Data Caching', () => {
    it('should cache and retrieve health data', async () => {
      const userId = 1;
      const timeRange = '7days';
      const healthData = [
        {
          id: 1,
          userId: 1,
          dataType: 'weight',
          value: '70.5',
          unit: 'kg',
          timestamp: new Date(),
          source: 'manual',
          category: 'body_composition',
          metadata: {}
        }
      ];

      // First call should return null (cache miss)
      const cached1 = await cacheService.getHealthData(userId, timeRange);
      expect(cached1).toBeNull();

      // Set the cache
      cacheService.setHealthData(userId, timeRange, healthData);

      // Second call should return cached value (cache hit)
      const cached2 = await cacheService.getHealthData(userId, timeRange);
      expect(cached2).toEqual(healthData);
    });
  });

  describe('AI Response Caching', () => {
    it('should cache and retrieve AI responses', async () => {
      const prompt = 'What is the weather like today?';
      const model = 'gpt-4o';
      const userId = 1;
      const response = 'I cannot access real-time weather data.';
      const metadata = { tokenCount: 15 };

      // First call should return null (cache miss)
      const cached1 = await cacheService.getAiResponse(prompt, model, userId);
      expect(cached1).toBeNull();

      // Set the cache
      cacheService.setAiResponse(prompt, model, userId, response, metadata);

      // Second call should return cached value (cache hit)
      const cached2 = await cacheService.getAiResponse(prompt, model, userId);
      expect(cached2).toBeTruthy();
      expect(cached2?.response).toBe(response);
      expect(cached2?.metadata.model).toBe(model);
    });
  });

  describe('Device Settings Caching', () => {
    it('should cache and retrieve device settings', async () => {
      const deviceId = 1;
      const device = {
        id: 1,
        userId: 1,
        deviceName: 'Smart Watch',
        deviceType: 'smartwatch',
        isActive: true,
        lastSync: new Date(),
        createdAt: new Date(),
        metadata: { features: ['steps', 'heart_rate'] }
      };

      // First call should return null (cache miss)
      const cached1 = await cacheService.getDeviceSettings(deviceId);
      expect(cached1).toBeNull();

      // Set the cache
      cacheService.setDeviceSettings(deviceId, device);

      // Second call should return cached value (cache hit)
      const cached2 = await cacheService.getDeviceSettings(deviceId);
      expect(cached2).toEqual(device);
    });

    it('should invalidate device cache', async () => {
      const deviceId = 1;
      const device = { id: 1, deviceName: 'Test Device' };

      cacheService.setDeviceSettings(deviceId, device as any);
      
      // Verify cache exists
      const cached = await cacheService.getDeviceSettings(deviceId);
      expect(cached).toEqual(device);

      // Invalidate cache
      cacheService.invalidateDeviceData(deviceId);

      // Cache should be cleared
      const cachedAfterInvalidation = await cacheService.getDeviceSettings(deviceId);
      expect(cachedAfterInvalidation).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      const userId = 1;
      const settings = { aiProvider: 'openai' };

      // Generate a cache miss
      await cacheService.getUserSettings(userId);

      // Generate a cache hit
      cacheService.setUserSettings(userId, settings);
      await cacheService.getUserSettings(userId);

      const stats = cacheService.getStats();
      expect(stats.userSettings).toBeTruthy();
      expect(stats.userSettings.hits).toBeGreaterThan(0);
      expect(stats.userSettings.misses).toBeGreaterThan(0);
      expect(stats.userSettings.hitRate).toBeTruthy();
    });
  });

  describe('Cache Clearing', () => {
    it('should clear all caches', async () => {
      const userId = 1;
      const settings = { aiProvider: 'openai' };
      const deviceId = 1;
      const device = { id: 1, deviceName: 'Test' };

      // Set multiple cache entries
      cacheService.setUserSettings(userId, settings);
      cacheService.setDeviceSettings(deviceId, device as any);

      // Clear all caches
      cacheService.clearAll();

      // All caches should be empty
      const userSettings = await cacheService.getUserSettings(userId);
      const deviceSettings = await cacheService.getDeviceSettings(deviceId);
      
      expect(userSettings).toBeNull();
      expect(deviceSettings).toBeNull();
    });

    it('should clear specific cache category', async () => {
      const userId = 1;
      const settings = { aiProvider: 'openai' };
      const deviceId = 1;
      const device = { id: 1, deviceName: 'Test' };

      // Set multiple cache entries
      cacheService.setUserSettings(userId, settings);
      cacheService.setDeviceSettings(deviceId, device as any);

      // Clear only user settings cache
      cacheService.clearCategory('userSettings');

      // User settings should be cleared, device settings should remain
      const userSettings = await cacheService.getUserSettings(userId);
      const deviceSettings = await cacheService.getDeviceSettings(deviceId);
      
      expect(userSettings).toBeNull();
      expect(deviceSettings).toEqual(device);
    });
  });
});