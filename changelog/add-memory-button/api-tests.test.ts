import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the memory service
const mockMemoryService = {
  createMemory: vi.fn(),
  processMessageForMemory: vi.fn(),
};

vi.mock('../../server/services/memory-service', () => ({
  memoryService: mockMemoryService
}));

describe('Manual Memory API Endpoint', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Add the manual memory endpoint
    app.post('/api/memories/manual', async (req, res) => {
      try {
        const userId = 1;
        const { content, category, importance } = req.body;

        // Validate input
        if (!content || content.trim().length < 10) {
          return res.status(400).json({ message: "Memory content must be at least 10 characters" });
        }

        if (!["preference", "personal_info", "context", "instruction"].includes(category)) {
          return res.status(400).json({ message: "Invalid category" });
        }

        if (typeof importance !== "number" || importance < 0 || importance > 1) {
          return res.status(400).json({ message: "Importance must be a number between 0 and 1" });
        }

        // Use the mocked memory service
        const memory = await mockMemoryService.createMemory(
          userId,
          content.trim(),
          category,
          importance,
          null,
          null,
          []
        );

        if (memory) {
          // Background processing (non-blocking)
          try {
            await mockMemoryService.processMessageForMemory(
              userId,
              content,
              null,
              null,
              []
            );
          } catch (processingError) {
            console.warn('Background memory processing failed for manual entry:', processingError);
          }

          res.status(201).json({
            success: true,
            memory: {
              id: memory.id,
              content: memory.content,
              category: memory.category,
              importance: memory.importanceScore,
              createdAt: memory.createdAt
            },
            message: "Memory processed and saved successfully"
          });
        } else {
          res.status(500).json({ message: "Failed to save memory" });
        }
      } catch (error) {
        console.error('Error creating manual memory:', error);
        res.status(500).json({ message: "Failed to create memory" });
      }
    });

    // Reset mocks
    mockMemoryService.createMemory.mockClear();
    mockMemoryService.processMessageForMemory.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Input Validation', () => {
    it('rejects requests with missing content', async () => {
      const response = await request(app)
        .post('/api/memories/manual')
        .send({
          category: 'preference',
          importance: 0.6
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Memory content must be at least 10 characters');
    });

    it('rejects requests with content too short', async () => {
      const response = await request(app)
        .post('/api/memories/manual')
        .send({
          content: 'short',
          category: 'preference',
          importance: 0.6
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Memory content must be at least 10 characters');
    });

    it('rejects requests with invalid category', async () => {
      const response = await request(app)
        .post('/api/memories/manual')
        .send({
          content: 'This is a valid length memory content',
          category: 'invalid_category',
          importance: 0.6
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid category');
    });

    it('rejects requests with invalid importance type', async () => {
      const response = await request(app)
        .post('/api/memories/manual')
        .send({
          content: 'This is a valid length memory content',
          category: 'preference',
          importance: 'high' // Should be number, not string
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Importance must be a number between 0 and 1');
    });

    it('rejects requests with importance out of range', async () => {
      const response = await request(app)
        .post('/api/memories/manual')
        .send({
          content: 'This is a valid length memory content',
          category: 'preference',
          importance: 1.5 // Out of range
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Importance must be a number between 0 and 1');
    });

    it('accepts valid requests with all required fields', async () => {
      const mockMemory = {
        id: 'test-id-123',
        content: 'This is a valid length memory content',
        category: 'preference',
        importanceScore: 0.6,
        createdAt: new Date()
      };

      mockMemoryService.createMemory.mockResolvedValue(mockMemory);
      mockMemoryService.processMessageForMemory.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/memories/manual')
        .send({
          content: 'This is a valid length memory content',
          category: 'preference',
          importance: 0.6
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.memory.content).toBe('This is a valid length memory content');
    });
  });

  describe('Memory Service Integration', () => {
    it('calls createMemory with correct parameters', async () => {
      const mockMemory = {
        id: 'test-id-123',
        content: 'I prefer morning workouts and avoid dairy',
        category: 'preference',
        importanceScore: 0.8,
        createdAt: new Date()
      };

      mockMemoryService.createMemory.mockResolvedValue(mockMemory);

      await request(app)
        .post('/api/memories/manual')
        .send({
          content: 'I prefer morning workouts and avoid dairy',
          category: 'preference',
          importance: 0.8
        });

      expect(mockMemoryService.createMemory).toHaveBeenCalledWith(
        1, // userId
        'I prefer morning workouts and avoid dairy', // content (trimmed)
        'preference', // category
        0.8, // importance
        null, // conversationId
        null, // messageId
        [] // keywords
      );
    });

    it('calls processMessageForMemory for background processing', async () => {
      const mockMemory = {
        id: 'test-id-123',
        content: 'Test content for background processing',
        category: 'context',
        importanceScore: 0.5,
        createdAt: new Date()
      };

      mockMemoryService.createMemory.mockResolvedValue(mockMemory);

      await request(app)
        .post('/api/memories/manual')
        .send({
          content: 'Test content for background processing',
          category: 'context',
          importance: 0.5
        });

      expect(mockMemoryService.processMessageForMemory).toHaveBeenCalledWith(
        1, // userId
        'Test content for background processing', // content
        null, // conversationId
        null, // messageId
        [] // conversationHistory
      );
    });

    it('continues processing even if background processing fails', async () => {
      const mockMemory = {
        id: 'test-id-123',
        content: 'Test content with failing background process',
        category: 'instruction',
        importanceScore: 0.9,
        createdAt: new Date()
      };

      mockMemoryService.createMemory.mockResolvedValue(mockMemory);
      mockMemoryService.processMessageForMemory.mockRejectedValue(new Error('Background processing failed'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/memories/manual')
        .send({
          content: 'Test content with failing background process',
          category: 'instruction',
          importance: 0.9
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Background memory processing failed for manual entry:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Response Format', () => {
    it('returns correct response structure for successful creation', async () => {
      const mockMemory = {
        id: 'uuid-test-123',
        content: 'My personal training preference is high intensity interval training',
        category: 'personal_info',
        importanceScore: 0.7,
        createdAt: new Date('2025-06-17T12:00:00Z')
      };

      mockMemoryService.createMemory.mockResolvedValue(mockMemory);

      const response = await request(app)
        .post('/api/memories/manual')
        .send({
          content: 'My personal training preference is high intensity interval training',
          category: 'personal_info',
          importance: 0.7
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        memory: {
          id: 'uuid-test-123',
          content: 'My personal training preference is high intensity interval training',
          category: 'personal_info',
          importance: 0.7,
          createdAt: new Date('2025-06-17T12:00:00Z')
        },
        message: 'Memory processed and saved successfully'
      });
    });

    it('returns error response when memory creation fails', async () => {
      mockMemoryService.createMemory.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/memories/manual')
        .send({
          content: 'Valid content but creation will fail',
          category: 'preference',
          importance: 0.5
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to save memory');
    });

    it('handles unexpected errors gracefully', async () => {
      mockMemoryService.createMemory.mockRejectedValue(new Error('Database connection failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/memories/manual')
        .send({
          content: 'Content that will cause unexpected error',
          category: 'context',
          importance: 0.4
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to create memory');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error creating manual memory:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Category Validation', () => {
    const validCategories = ['preference', 'personal_info', 'context', 'instruction'];

    validCategories.forEach(category => {
      it(`accepts valid category: ${category}`, async () => {
        const mockMemory = {
          id: `test-id-${category}`,
          content: `Test content for ${category} category`,
          category,
          importanceScore: 0.5,
          createdAt: new Date()
        };

        mockMemoryService.createMemory.mockResolvedValue(mockMemory);

        const response = await request(app)
          .post('/api/memories/manual')
          .send({
            content: `Test content for ${category} category`,
            category,
            importance: 0.5
          });

        expect(response.status).toBe(201);
        expect(response.body.memory.category).toBe(category);
      });
    });
  });

  describe('Importance Score Validation', () => {
    const validImportanceScores = [0, 0.1, 0.3, 0.5, 0.6, 0.8, 0.9, 1.0];

    validImportanceScores.forEach(importance => {
      it(`accepts valid importance score: ${importance}`, async () => {
        const mockMemory = {
          id: `test-id-${importance}`,
          content: `Test content with importance ${importance}`,
          category: 'preference',
          importanceScore: importance,
          createdAt: new Date()
        };

        mockMemoryService.createMemory.mockResolvedValue(mockMemory);

        const response = await request(app)
          .post('/api/memories/manual')
          .send({
            content: `Test content with importance ${importance}`,
            category: 'preference',
            importance
          });

        expect(response.status).toBe(201);
        expect(response.body.memory.importance).toBe(importance);
      });
    });

    const invalidImportanceScores = [-0.1, 1.1, 2.0, -1];

    invalidImportanceScores.forEach(importance => {
      it(`rejects invalid importance score: ${importance}`, async () => {
        const response = await request(app)
          .post('/api/memories/manual')
          .send({
            content: 'Test content with invalid importance',
            category: 'preference',
            importance
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Importance must be a number between 0 and 1');
      });
    });
  });

  describe('Content Processing', () => {
    it('trims whitespace from content', async () => {
      const mockMemory = {
        id: 'test-trim-id',
        content: 'Content with trimmed whitespace',
        category: 'preference',
        importanceScore: 0.5,
        createdAt: new Date()
      };

      mockMemoryService.createMemory.mockResolvedValue(mockMemory);

      await request(app)
        .post('/api/memories/manual')
        .send({
          content: '   Content with trimmed whitespace   ',
          category: 'preference',
          importance: 0.5
        });

      expect(mockMemoryService.createMemory).toHaveBeenCalledWith(
        1,
        'Content with trimmed whitespace', // Should be trimmed
        'preference',
        0.5,
        null,
        null,
        []
      );
    });

    it('handles content at minimum length boundary', async () => {
      const minContent = '1234567890'; // Exactly 10 characters

      const mockMemory = {
        id: 'test-min-id',
        content: minContent,
        category: 'context',
        importanceScore: 0.3,
        createdAt: new Date()
      };

      mockMemoryService.createMemory.mockResolvedValue(mockMemory);

      const response = await request(app)
        .post('/api/memories/manual')
        .send({
          content: minContent,
          category: 'context',
          importance: 0.3
        });

      expect(response.status).toBe(201);
      expect(response.body.memory.content).toBe(minContent);
    });
  });
});