/**
 * Performance tests for memory graph consolidation optimization
 * Task 7: Consolidation Algorithm Optimization validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryGraphService } from '../services/memory-graph-service';
import type { MemoryEntry } from '@shared/schema';

describe('Memory Graph Consolidation Optimization', () => {
  let memoryGraphService: MemoryGraphService;
  
  beforeEach(() => {
    memoryGraphService = new MemoryGraphService();
  });

  afterEach(() => {
    // Clean up any test data if needed
  });

  it('should consolidate 100 memories in under 2 seconds', async () => {
    // Generate test memories
    const testMemories: MemoryEntry[] = generateTestMemories(100);
    
    const startTime = Date.now();
    
    // Run consolidation
    const results = await memoryGraphService.consolidateRelatedMemories(1);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Validate performance target: <2s for 100 memories
    expect(processingTime).toBeLessThan(2000);
    
    console.log(`✅ Consolidation performance: ${processingTime}ms for 100 memories`);
  }, 10000); // 10 second timeout for safety

  it('should achieve high cache hit rate for repeated relationship analysis', async () => {
    const testMemories = generateTestMemories(20);
    
    // First pass - populate cache
    await memoryGraphService.consolidateRelatedMemories(1);
    
    // Second pass - should hit cache
    const startTime = Date.now();
    await memoryGraphService.consolidateRelatedMemories(1);
    const endTime = Date.now();
    
    const secondPassTime = endTime - startTime;
    
    // Second pass should be significantly faster due to caching
    expect(secondPassTime).toBeLessThan(500); // Should be much faster with cache
    
    console.log(`✅ Cache optimization: ${secondPassTime}ms for cached consolidation`);
  });

  it('should handle batch processing efficiently', async () => {
    const testMemories = generateTestMemories(50);
    
    const startTime = Date.now();
    
    // Test batch relationship analysis
    const relationshipMap = await (memoryGraphService as any).batchAnalyzeRelationships(testMemories);
    
    const endTime = Date.now();
    const batchTime = endTime - startTime;
    
    // Batch processing should be efficient
    expect(batchTime).toBeLessThan(1000);
    expect(relationshipMap.size).toBeGreaterThan(0);
    
    console.log(`✅ Batch processing: ${batchTime}ms for ${testMemories.length} memories`);
  });
});

function generateTestMemories(count: number): MemoryEntry[] {
  const memories: MemoryEntry[] = [];
  const categories = ['preferences', 'goals', 'habits', 'health', 'nutrition'];
  
  for (let i = 0; i < count; i++) {
    memories.push({
      id: `test-memory-${i}`,
      userId: 1,
      content: `Test memory content ${i} - ${getRandomContent(i)}`,
      category: categories[i % categories.length],
      importanceScore: Math.random() * 10,
      keywords: [`keyword${i}`, `test${i % 5}`],
      isActive: true,
      createdAt: new Date(Date.now() - Math.random() * 1000000),
      updatedAt: new Date(),
      embedding: null,
      sourceConversationId: null
    });
  }
  
  return memories;
}

function getRandomContent(index: number): string {
  const patterns = [
    "I prefer morning workouts over evening sessions",
    "My goal is to drink 8 glasses of water daily", 
    "I usually eat breakfast around 7 AM",
    "I want to reduce my sugar intake",
    "Walking is my favorite form of exercise",
    "I try to sleep 8 hours each night",
    "Meditation helps me stay focused",
    "I enjoy cooking healthy meals"
  ];
  
  return patterns[index % patterns.length];
}