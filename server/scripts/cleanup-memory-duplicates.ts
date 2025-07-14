#!/usr/bin/env node

/**
 * Memory Duplicate Cleanup Script
 * 
 * This script identifies and consolidates duplicate memory entries
 * based on content similarity and semantic hash matching.
 * 
 * Usage: node server/scripts/cleanup-memory-duplicates.js [--dry-run]
 */

import { db, initializeDatabase } from "../../shared/database/db.js";
import { memoryEntries } from "../../shared/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

interface DuplicateGroup {
  primaryMemory: any;
  duplicates: any[];
  reason: 'exact_content' | 'semantic_hash' | 'high_similarity';
  similarity: number;
}

class MemoryDuplicateCleanup {
  private dryRun = false;
  private stats = {
    totalMemories: 0,
    duplicateGroups: 0,
    memoriesDeactivated: 0,
    memoriesUpdated: 0,
    processingTime: 0
  };

  constructor(dryRun = false) {
    this.dryRun = dryRun;
  }

  /**
   * Main cleanup process
   */
  async cleanup(): Promise<void> {
    const startTime = Date.now();
    
    console.log('🧹 Starting memory duplicate cleanup...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    
    try {
      // Step 1: Load all active memories
      const allMemories = await this.loadAllMemories();
      this.stats.totalMemories = allMemories.length;
      
      console.log(`📊 Found ${allMemories.length} active memories`);
      
      // Step 2: Identify duplicate groups
      const duplicateGroups = await this.identifyDuplicates(allMemories);
      this.stats.duplicateGroups = duplicateGroups.length;
      
      console.log(`🔍 Identified ${duplicateGroups.length} duplicate groups`);
      
      // Step 3: Process each duplicate group
      for (const group of duplicateGroups) {
        await this.processDuplicateGroup(group);
      }
      
      this.stats.processingTime = Date.now() - startTime;
      
      // Step 4: Report results
      this.reportResults();
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Load all active memories from database
   */
  private async loadAllMemories(): Promise<any[]> {
    return await db
      .select()
      .from(memoryEntries)
      .where(eq(memoryEntries.isActive, true))
      .orderBy(desc(memoryEntries.createdAt));
  }

  /**
   * Identify duplicate groups using multiple strategies
   */
  private async identifyDuplicates(memories: any[]): Promise<DuplicateGroup[]> {
    const duplicateGroups: DuplicateGroup[] = [];
    const processed = new Set<string>();
    
    for (let i = 0; i < memories.length; i++) {
      const memory = memories[i];
      
      if (processed.has(memory.id)) continue;
      
      const duplicates: any[] = [];
      
      // Check remaining memories for duplicates
      for (let j = i + 1; j < memories.length; j++) {
        const candidate = memories[j];
        
        if (processed.has(candidate.id)) continue;
        
        // Strategy 1: Exact content match
        if (this.isExactContentMatch(memory, candidate)) {
          duplicates.push(candidate);
          processed.add(candidate.id);
          continue;
        }
        
        // Strategy 2: Semantic hash match
        if (memory.semanticHash && candidate.semanticHash && 
            memory.semanticHash === candidate.semanticHash) {
          duplicates.push(candidate);
          processed.add(candidate.id);
          continue;
        }
        
        // Strategy 3: High similarity match
        const similarity = this.calculateFuzzySimilarity(memory.content, candidate.content);
        if (similarity > 0.85) {
          duplicates.push(candidate);
          processed.add(candidate.id);
        }
      }
      
      if (duplicates.length > 0) {
        // Select primary memory (highest importance, then newest)
        const allMemories = [memory, ...duplicates];
        const primaryMemory = this.selectPrimaryMemory(allMemories);
        const duplicateMemories = allMemories.filter(m => m.id !== primaryMemory.id);
        
        duplicateGroups.push({
          primaryMemory,
          duplicates: duplicateMemories,
          reason: this.determineDuplicateReason(memory, duplicates[0]),
          similarity: duplicates.length > 0 ? this.calculateFuzzySimilarity(memory.content, duplicates[0].content) : 1.0
        });
      }
      
      processed.add(memory.id);
    }
    
    return duplicateGroups;
  }

  /**
   * Check if two memories have exactly the same content
   */
  private isExactContentMatch(memory1: any, memory2: any): boolean {
    const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
    return normalize(memory1.content) === normalize(memory2.content);
  }

  /**
   * Calculate fuzzy similarity between two content strings
   */
  private calculateFuzzySimilarity(content1: string, content2: string): number {
    const normalizeContent = (text: string) => 
      text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    
    const words1 = normalizeContent(content1).split(/\s+/).filter(w => w.length > 2);
    const words2 = normalizeContent(content2).split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    // Jaccard similarity
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(w => set2.has(w)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Select the primary memory to keep from a group
   */
  private selectPrimaryMemory(memories: any[]): any {
    return memories.reduce((best, current) => {
      // Priority 1: Higher importance score
      if (current.importanceScore > best.importanceScore) return current;
      if (current.importanceScore < best.importanceScore) return best;
      
      // Priority 2: Higher access count
      if (current.accessCount > best.accessCount) return current;
      if (current.accessCount < best.accessCount) return best;
      
      // Priority 3: More recent
      if (current.createdAt > best.createdAt) return current;
      
      return best;
    });
  }

  /**
   * Determine the reason for duplicate classification
   */
  private determineDuplicateReason(memory1: any, memory2: any): DuplicateGroup['reason'] {
    if (this.isExactContentMatch(memory1, memory2)) {
      return 'exact_content';
    }
    
    if (memory1.semanticHash && memory2.semanticHash && 
        memory1.semanticHash === memory2.semanticHash) {
      return 'semantic_hash';
    }
    
    return 'high_similarity';
  }

  /**
   * Process a duplicate group by merging or deactivating duplicates
   */
  private async processDuplicateGroup(group: DuplicateGroup): Promise<void> {
    console.log(`\n📋 Processing duplicate group (${group.reason}, similarity: ${group.similarity.toFixed(2)})`);
    console.log(`  Primary: "${group.primaryMemory.content.substring(0, 50)}..." (importance: ${group.primaryMemory.importanceScore})`);
    
    for (const duplicate of group.duplicates) {
      console.log(`  Duplicate: "${duplicate.content.substring(0, 50)}..." (importance: ${duplicate.importanceScore})`);
      
      if (!this.dryRun) {
        // Merge information into primary memory
        await this.mergeMemories(group.primaryMemory, duplicate);
        
        // Deactivate duplicate
        await this.deactivateMemory(duplicate);
      }
    }
    
    this.stats.memoriesDeactivated += group.duplicates.length;
    this.stats.memoriesUpdated += 1;
  }

  /**
   * Merge information from duplicate into primary memory
   */
  private async mergeMemories(primary: any, duplicate: any): Promise<void> {
    try {
      // Merge labels and keywords
      const mergedLabels = Array.from(new Set([
        ...(primary.labels || []),
        ...(duplicate.labels || [])
      ]));
      
      const mergedKeywords = Array.from(new Set([
        ...(primary.keywords || []),
        ...(duplicate.keywords || [])
      ]));
      
      // Use highest importance score
      const mergedImportance = Math.max(primary.importanceScore, duplicate.importanceScore);
      
      // Combine access counts
      const mergedAccessCount = primary.accessCount + duplicate.accessCount;
      
      // Update primary memory
      await db
        .update(memoryEntries)
        .set({
          labels: mergedLabels,
          keywords: mergedKeywords,
          importanceScore: mergedImportance,
          accessCount: mergedAccessCount,
          updateCount: sql`${memoryEntries.updateCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(memoryEntries.id, primary.id));
      
      console.log(`  ✅ Merged data into primary memory`);
      
    } catch (error) {
      console.error(`  ❌ Failed to merge memories:`, error);
    }
  }

  /**
   * Deactivate a duplicate memory
   */
  private async deactivateMemory(memory: any): Promise<void> {
    try {
      await db
        .update(memoryEntries)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(memoryEntries.id, memory.id));
      
      console.log(`  🗑️ Deactivated duplicate memory`);
      
    } catch (error) {
      console.error(`  ❌ Failed to deactivate memory:`, error);
    }
  }

  /**
   * Report cleanup results
   */
  private reportResults(): void {
    console.log('\n' + '='.repeat(50));
    console.log('🏁 CLEANUP RESULTS');
    console.log('='.repeat(50));
    console.log(`Total memories processed: ${this.stats.totalMemories}`);
    console.log(`Duplicate groups found: ${this.stats.duplicateGroups}`);
    console.log(`Memories deactivated: ${this.stats.memoriesDeactivated}`);
    console.log(`Memories updated: ${this.stats.memoriesUpdated}`);
    console.log(`Processing time: ${(this.stats.processingTime / 1000).toFixed(2)}s`);
    
    if (this.stats.duplicateGroups > 0) {
      const reduction = (this.stats.memoriesDeactivated / this.stats.totalMemories * 100).toFixed(1);
      console.log(`Memory reduction: ${reduction}%`);
    }
    
    console.log(`\nMode: ${this.dryRun ? 'DRY RUN (no changes made)' : 'LIVE (changes applied)'}`);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  try {
    // Initialize database if needed
    if (typeof initializeDatabase === 'function') {
      await initializeDatabase();
    }
    
    // Add a small delay to ensure database is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const cleanup = new MemoryDuplicateCleanup(dryRun);
    await cleanup.cleanup();
    console.log('✅ Cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}