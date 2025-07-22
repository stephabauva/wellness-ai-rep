/**
 * Factory for initializing memory service dependencies
 * @used-by memory/memory-service - Service initialization
 */
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MemoryCache } from './memory-cache';
import { AIMemoryDetector } from './ai-detection';
import { EmbeddingService } from './embedding-service';
import { MemoryQualityService } from './quality-metrics';
import { MemoryRetrievalService } from './retrieval-service';
import { BackgroundProcessingManager } from './background-processing-manager';
import { MemoryContentValidator } from './content-validation';
import { MemoryCacheManager } from './cache-management';
import { MemoryPerformanceUtils } from './performance-utils';
import { MemoryHashUtils } from './hash-utils';
import { MemoryDatabaseOperations } from './database-operations';
import { MemoryLoggingUtils } from './logging-utils';
import { MemoryQueryOperations } from './query-operations';
import { MemorySimilarityOperations } from './similarity-operations';
import { MemoryMessageProcessor } from './message-processor';

export interface MemoryServiceDependencies {
  openai: OpenAI;
  google: GoogleGenerativeAI;
  memoryCache: MemoryCache;
  aiDetector: AIMemoryDetector;
  embeddingService: EmbeddingService;
  qualityService: MemoryQualityService;
  retrievalService: MemoryRetrievalService;
  backgroundProcessingManager: BackgroundProcessingManager;
  contentValidator: MemoryContentValidator;
  cacheManager: MemoryCacheManager;
  performanceUtils: MemoryPerformanceUtils;
  hashUtils: MemoryHashUtils;
  databaseOps: MemoryDatabaseOperations;
  loggingUtils: MemoryLoggingUtils;
  queryOps: MemoryQueryOperations;
  similarityOps: MemorySimilarityOperations;
  messageProcessor: MemoryMessageProcessor;
}

export class MemoryServiceFactory {
  static createDependencies(): MemoryServiceDependencies {
    // Initialize AI services
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const google = new GoogleGenerativeAI(
      process.env.GOOGLE_API_KEY || ''
    );
    
    // Initialize cache manager
    const memoryCache = new MemoryCache();
    
    // Initialize AI detector
    const aiDetector = new AIMemoryDetector(openai);
    
    // Initialize embedding service
    const embeddingService = new EmbeddingService(openai);
    
    // Initialize quality metrics service
    const qualityService = new MemoryQualityService();
    
    // Initialize memory retrieval service
    const retrievalService = new MemoryRetrievalService(embeddingService, memoryCache);
    
    // Initialize background processing manager
    const backgroundProcessingManager = new BackgroundProcessingManager(
      memoryCache,
      aiDetector,
      embeddingService
    );
    
    // Initialize content validator
    const contentValidator = new MemoryContentValidator();
    
    // Initialize cache manager
    const cacheManager = new MemoryCacheManager(memoryCache);
    
    // Initialize hash utilities
    const hashUtils = new MemoryHashUtils();
    
    // Initialize database operations
    const databaseOps = new MemoryDatabaseOperations();
    
    // Initialize logging utilities
    const loggingUtils = new MemoryLoggingUtils();
    
    // Initialize query operations
    const queryOps = new MemoryQueryOperations(qualityService);
    
    // Initialize similarity operations
    const similarityOps = new MemorySimilarityOperations(
      embeddingService,
      cacheManager
    );
    
    // Initialize performance utilities
    const performanceUtils = new MemoryPerformanceUtils(
      memoryCache,
      contentValidator,
      qualityService,
      retrievalService,
      backgroundProcessingManager
    );
    
    // Initialize message processor
    const messageProcessor = new MemoryMessageProcessor(
      contentValidator,
      cacheManager,
      backgroundProcessingManager,
      databaseOps
    );

    return {
      openai,
      google,
      memoryCache,
      aiDetector,
      embeddingService,
      qualityService,
      retrievalService,
      backgroundProcessingManager,
      contentValidator,
      cacheManager,
      performanceUtils,
      hashUtils,
      databaseOps,
      loggingUtils,
      queryOps,
      similarityOps,
      messageProcessor
    };
  }
}