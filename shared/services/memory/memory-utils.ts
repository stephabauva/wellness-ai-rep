/**
 * Pure utility functions for memory processing
 * @used-by memory/memory-service - Core memory operations
 */

/**
 * Generate semantic hash for deduplication
 */
export function generateSemanticHash(message: string): string {
  const normalizedText = message.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = normalizedText.split(' ')
    .filter(word => word.length > 3)
    .sort()
    .slice(0, 10);

  const keyContent = words.join('|');
  return require('crypto').createHash('md5').update(keyContent).digest('hex').slice(0, 16);
}

/**
 * Synchronous cosine similarity calculation
 */
export function cosineSimilaritySync(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Create similarity cache key
 */
export function createSimilarityCacheKey(vectorA: number[], vectorB: number[]): string {
  const hashA = vectorA.slice(0, 10).map(v => Math.round(v * 1000)).join(',');
  const hashB = vectorB.slice(0, 10).map(v => Math.round(v * 1000)).join(',');
  return `sim-${hashA}-${hashB}`;
}

/**
 * Normalize content for comparison
 */
export function normalizeContent(content: string): string {
  return content.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Jaccard similarity between two strings
 */
export function calculateJaccardSimilarity(content1: string, content2: string): number {
  const words1 = new Set(content1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(content2.split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Calculate average content length
 */
export function calculateAverageContentLength(memories: any[]): number {
  if (memories.length === 0) return 0;
  
  const totalLength = memories.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  return totalLength / memories.length;
}

/**
 * Calculate category balance score
 */
export function calculateCategoryBalance(categoryDistribution: Record<string, number>): number {
  const categories = Object.values(categoryDistribution);
  if (categories.length === 0) return 0;
  
  const total = categories.reduce((sum, count) => sum + count, 0);
  const expectedPerCategory = total / categories.length;
  
  const variance = categories.reduce((sum, count) => 
    sum + Math.pow(count - expectedPerCategory, 2), 0) / categories.length;
  
  return Math.max(0, 1 - (variance / (expectedPerCategory * expectedPerCategory)));
}

/**
 * Calculate overall quality score
 */
export function calculateQualityScore(metrics: {
  duplicateRate: number;
  averageImportanceScore: number;
  averageFreshness: number;
  categoryBalance: number;
  contentLength: number;
}): number {
  const weights = {
    duplicateRate: 0.3,
    importanceScore: 0.25,
    freshness: 0.2,
    categoryBalance: 0.15,
    contentLength: 0.1
  };
  
  const duplicateScore = Math.max(0, 1 - metrics.duplicateRate);
  const importanceScore = Math.min(1, metrics.averageImportanceScore / 10);
  const freshnessScore = Math.min(1, metrics.averageFreshness);
  const categoryScore = metrics.categoryBalance;
  const contentScore = Math.min(1, Math.max(0, 
    1 - Math.abs(metrics.contentLength - 100) / 200));
  
  return (
    duplicateScore * weights.duplicateRate +
    importanceScore * weights.importanceScore +
    freshnessScore * weights.freshness +
    categoryScore * weights.categoryBalance +
    contentScore * weights.contentLength
  );
}