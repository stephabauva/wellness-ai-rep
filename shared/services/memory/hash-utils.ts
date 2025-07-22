/**
 * @used-by shared/memory-service - Hash generation utilities
 * @service-type utility
 * @extracted-from memory-service.ts lines 115-122
 */
import { generateSemanticHash as generateSemanticHashUtil } from '../memory/memory-utils';
import { checkSemanticDuplicate as checkSemanticDuplicateUtil } from '../memory/database-utils';

export class MemoryHashUtils {
  // Fast semantic deduplication using imported utility
  generateSemanticHash(message: string): string {
    return generateSemanticHashUtil(message);
  }

  async checkSemanticDuplicate(userId: number, semanticHash: string): Promise<boolean> {
    return checkSemanticDuplicateUtil(userId, semanticHash);
  }
}