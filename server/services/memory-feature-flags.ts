/**
 * Phase 4: Production Deployment - Feature Flag Configuration
 * Environment-based feature control with gradual rollout capability
 */
export class MemoryFeatureFlags {
  private readonly features = {
    ENABLE_CHATGPT_MEMORY: process.env.ENABLE_CHATGPT_MEMORY === 'true',
    ENABLE_REAL_TIME_DEDUP: process.env.ENABLE_REAL_TIME_DEDUP === 'true',
    ENABLE_ENHANCED_PROMPTS: process.env.ENABLE_ENHANCED_PROMPTS === 'true',
    ENABLE_BATCH_PROCESSING: process.env.ENABLE_BATCH_PROCESSING === 'true',
    ENABLE_CIRCUIT_BREAKERS: process.env.ENABLE_CIRCUIT_BREAKERS === 'true'
  };

  private readonly rolloutPercentages = {
    CHATGPT_MEMORY_ROLLOUT: parseInt(process.env.CHATGPT_MEMORY_ROLLOUT || '10'),
    ENHANCED_PROMPTS_ROLLOUT: parseInt(process.env.ENHANCED_PROMPTS_ROLLOUT || '25'),
    BATCH_PROCESSING_ROLLOUT: parseInt(process.env.BATCH_PROCESSING_ROLLOUT || '50')
  };

  /**
   * Check if ChatGPT memory features should be enabled for user
   */
  shouldEnableChatGPTMemory(userId: number): boolean {
    if (!this.features.ENABLE_CHATGPT_MEMORY) return false;
    
    // Gradual rollout based on user ID hash
    const userHash = userId % 100;
    return userHash < this.rolloutPercentages.CHATGPT_MEMORY_ROLLOUT;
  }

  /**
   * Check if enhanced prompts should be enabled for user
   */
  shouldEnableEnhancedPrompts(userId: number): boolean {
    if (!this.features.ENABLE_ENHANCED_PROMPTS) return false;
    
    const userHash = userId % 100;
    return userHash < this.rolloutPercentages.ENHANCED_PROMPTS_ROLLOUT;
  }

  /**
   * Check if batch processing should be enabled for user
   */
  shouldEnableBatchProcessing(userId: number): boolean {
    if (!this.features.ENABLE_BATCH_PROCESSING) return false;
    
    const userHash = userId % 100;
    return userHash < this.rolloutPercentages.BATCH_PROCESSING_ROLLOUT;
  }

  /**
   * Check if real-time deduplication is enabled
   */
  isRealTimeDeduplicationEnabled(): boolean {
    return this.features.ENABLE_REAL_TIME_DEDUP;
  }

  /**
   * Check if circuit breakers are enabled
   */
  areCircuitBreakersEnabled(): boolean {
    return this.features.ENABLE_CIRCUIT_BREAKERS;
  }

  /**
   * Get all feature states for monitoring
   */
  getAllFeatureStates(): Record<string, boolean | number> {
    return {
      ...this.features,
      ...this.rolloutPercentages
    };
  }

  /**
   * Check if user should get full memory enhancement suite
   */
  shouldEnableFullMemoryEnhancement(userId: number): boolean {
    return this.shouldEnableChatGPTMemory(userId) &&
           this.shouldEnableEnhancedPrompts(userId) &&
           this.isRealTimeDeduplicationEnabled();
  }

  /**
   * Get all feature flags and their current state
   */
  getAllFlags(): Record<string, any> {
    return {
      features: { ...this.features },
      rolloutPercentages: { ...this.rolloutPercentages },
      environment: {
        ENABLE_CHATGPT_MEMORY: process.env.ENABLE_CHATGPT_MEMORY,
        ENABLE_REAL_TIME_DEDUP: process.env.ENABLE_REAL_TIME_DEDUP,
        ENABLE_ENHANCED_PROMPTS: process.env.ENABLE_ENHANCED_PROMPTS,
        ENABLE_BATCH_PROCESSING: process.env.ENABLE_BATCH_PROCESSING,
        ENABLE_CIRCUIT_BREAKERS: process.env.ENABLE_CIRCUIT_BREAKERS
      }
    };
  }

  /**
   * Set a feature flag (for testing/admin purposes)
   */
  setFlag(flagName: string, value: boolean): boolean {
    if (flagName in this.features) {
      (this.features as any)[flagName] = value;
      return true;
    }
    return false;
  }
}

export const memoryFeatureFlags = new MemoryFeatureFlags();