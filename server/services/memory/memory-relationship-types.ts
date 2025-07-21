/**
 * Type definitions for Memory Relationship Engine
 * @used-by server/services/memory-relationship-engine
 */

export interface MemoryRelationship {
  id: string;
  sourceMemoryId: string;
  targetMemoryId: string;
  relationshipType: 'supports' | 'contradicts' | 'builds_on' | 'related_to' | 'temporal_sequence';
  strength: number; // 0.0 to 1.0
  confidence: number; // 0.0 to 1.0
  context: string;
  createdAt: Date;
}

export interface AtomicFact {
  id: string;
  memoryId: string;
  factType: 'preference' | 'goal' | 'constraint' | 'experience' | 'knowledge';
  content: string;
  confidence: number;
  extractedAt: Date;
}

export interface SemanticCluster {
  id: string;
  centroidEmbedding: number[];
  memoryIds: string[];
  clusterType: string;
  coherenceScore: number;
  lastUpdated: Date;
}