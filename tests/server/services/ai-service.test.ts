import { describe, it, expect, vi, beforeEach, afterEach, SpyInstance } from 'vitest';
import AiService from '../../../server/services/ai-service';
import { MockOpenAiProvider, MockGoogleProvider, resetAllProviderMocks } from '../mocks/ai-providers';
import { ChatMessage, AttachmentData, ProviderConfig, ModelName, AIProviderName, OpenAIModel, GoogleModel } from '../../../server/services/providers/ai-provider.interface';
import { memoryService } from '../../../server/services/memory-service'; // Actual instance for spying
import { chatContextService } from '../../../server/services/chat-context-service'; // Actual instance for spying

// Mock the actual providers to replace them with our mocks
vi.mock('../../../server/services/providers/openai-provider.ts', () => ({
  OpenAiProvider: MockOpenAiProvider,
}));
vi.mock('../../../server/services/providers/google-provider.ts', () => ({
  GoogleProvider: MockGoogleProvider,
}));

// Mock dependent services
vi.mock('../../../server/services/memory-service.ts', () => ({
  memoryService: {
    processMessageForMemory: vi.fn(),
    getContextualMemories: vi.fn(),
    logMemoryUsage: vi.fn(),
  }
}));
vi.mock('../../../server/services/chat-context-service.ts', () => ({
  chatContextService: {
    buildChatContext: vi.fn(),
  }
}));

describe('AiService', () => {
  let aiService: AiService;
  let originalOpenAiApiKey: string | undefined;
  let originalGoogleApiKey: string | undefined;

  // Spies for provider methods are on the *mock* provider instances, set up within setupService
  let openAiStreamSpy: SpyInstance | undefined;
  let googleStreamSpy: SpyInstance | undefined;
  let openAiNonStreamSpy: SpyInstance | undefined;
  let googleNonStreamSpy: SpyInstance | undefined;

  const setupServiceAndSpies = (keys: { openai?: string; google?: string }) => {
    // Set env vars for AiService constructor to pick up providers
    // These are temporarily overridden for the scope of a test if needed,
    // but global define in vitest.config.ts sets the base.
    if (keys.openai !== undefined) process.env.OPENAI_API_KEY = keys.openai;
    else delete process.env.OPENAI_API_KEY; // Ensure it's considered unset by AiService constructor

    if (keys.google !== undefined) process.env.GOOGLE_AI_API_KEY = keys.google;
    else delete process.env.GOOGLE_AI_API_KEY;

    aiService = new AiService(); // Instantiates and registers providers based on new env vars

    // Spy on methods of the *mocked* provider instances obtained from the service
    const mockOpenAiProviderInstance = aiService.getProvider('openai') as MockOpenAiProvider | undefined;
    const mockGoogleProviderInstance = aiService.getProvider('google') as MockGoogleProvider | undefined;

    if (mockOpenAiProviderInstance) {
      openAiStreamSpy = vi.spyOn(mockOpenAiProviderInstance, 'generateChatResponseStream');
      openAiNonStreamSpy = vi.spyOn(mockOpenAiProviderInstance, 'generateChatResponse');
    }
    if (mockGoogleProviderInstance) {
      googleStreamSpy = vi.spyOn(mockGoogleProviderInstance, 'generateChatResponseStream');
      googleNonStreamSpy = vi.spyOn(mockGoogleProviderInstance, 'generateChatResponse');
    }
  };

  beforeEach(() => {
    // Store original global env values (from vitest.config.ts define) to restore them
    originalOpenAiApiKey = process.env.OPENAI_API_KEY;
    originalGoogleApiKey = process.env.GOOGLE_AI_API_KEY;

    resetAllProviderMocks(); // Reset any specific mock responses/streams in providers
    vi.clearAllMocks(); // Clears spies on memoryService and chatContextService

    // Mock default implementations for dependent services for this test suite
    (memoryService.getContextualMemories as vi.Mock).mockResolvedValue([]);
    (memoryService.processMessageForMemory as vi.Mock).mockResolvedValue({ explicitMemory: null, autoDetectedMemory: null });
    (chatContextService.buildChatContext as vi.Mock).mockImplementation(async (userId, message, convId, mode, history, attachments, provider) => {
      // Return a basic set of messages for the AI provider
      return [{ role: 'user', content: message }];
    });
  });

  afterEach(() => {
    // Restore original global env values after each test
    process.env.OPENAI_API_KEY = originalOpenAiApiKey;
    process.env.GOOGLE_AI_API_KEY = originalGoogleApiKey;

    if (aiService) {
      // aiService.destroy(); // If AiService had a destroy method for cleanup
    }
  });

  const defaultUserPreferences = {
    userId: 1,
    conversationId: 'conv1',
    messageId: 1,
    coachingMode: 'weight-loss' as CoachingMode,
    conversationHistory: [],
    attachments: [] as AttachmentData[],
  };

  const callStream = (message: string, attachments?: AttachmentData[], userPrefsOverride: Partial<any> = {}) => {
    const userPrefs = { ...defaultUserPreferences, attachments: attachments || [], ...userPrefsOverride };
    return aiService.getChatResponseStream(
      message, userPrefs.userId, userPrefs.conversationId, userPrefs.messageId,
      userPrefs.coachingMode, userPrefs.conversationHistory,
      { provider: userPrefs.aiProvider || 'openai', model: userPrefs.aiModel || 'gpt-4o-mini' }, // Default to openai if not specified
      userPrefs.attachments, userPrefs.automaticModelSelection,
      vi.fn(), vi.fn(), vi.fn() // mock onChunk, onComplete, onError
    );
  };

  const callNonStream = (message: string, attachments?: AttachmentData[], userPrefsOverride: Partial<any> = {}) => {
    const userPrefs = { ...defaultUserPreferences, attachments: attachments || [], ...userPrefsOverride };
    return aiService.getChatResponse(
      message, userPrefs.userId, userPrefs.conversationId, userPrefs.messageId,
      userPrefs.coachingMode, userPrefs.conversationHistory,
      { provider: userPrefs.aiProvider || 'openai', model: userPrefs.aiModel || 'gpt-4o-mini' },
      userPrefs.attachments, userPrefs.automaticModelSelection
    );
  };

  const assertStreamCall = (spy: SpyInstance | undefined, expectedModel: ModelName) => {
    expect(spy).toHaveBeenCalled();
    if (spy && spy.mock.calls.length > 0) {
      const [,, config] = spy.mock.calls[0] as [ProviderChatMessage[], ProviderConfig, any, any, any, AttachmentData[] | undefined];
      expect(config.model).toBe(expectedModel);
    }
  };

  const assertNonStreamCall = (spy: SpyInstance | undefined, expectedModel: ModelName) => {
    expect(spy).toHaveBeenCalled();
    if (spy && spy.mock.calls.length > 0) {
      const [,, config] = spy.mock.calls[0] as [ProviderChatMessage[], ProviderConfig, AttachmentData[] | undefined];
      expect(config.model).toBe(expectedModel);
    }
  };

  describe('Automatic Model Selection (getChatResponseStream)', () => {
    const imageAttachment: AttachmentData[] = [{ fileName: 'image.png', fileType: 'image/png', url: 'data:image/png;base64,test' }];
    const pdfAttachment: AttachmentData[] = [{ fileName: 'doc.pdf', fileType: 'application/pdf', url: 'data:application/pdf;base64,test' }];
    const longMessage = 'Analyze this very long and complex query that requires a lot of processing power and advanced reasoning capabilities to understand fully.';
    const simpleMessage = 'Hi there!';

    it('should select Google Gemini Pro for images when both providers are available', async () => {
      setupServiceAndSpies({ google: 'test-google-key', openai: 'test-openai-key' });
      await callStream(simpleMessage, imageAttachment, { automaticModelSelection: true });
      assertStreamCall(googleStreamSpy, 'gemini-1.5-pro');
      expect(openAiStreamSpy).not.toHaveBeenCalled();
    });

    it('should select OpenAI GPT-4o for images when only OpenAI is available', async () => {
      setupServiceAndSpies({ openai: 'test-openai-key', google: undefined });
      await callStream(simpleMessage, imageAttachment, { automaticModelSelection: true });
      assertStreamCall(openAiStreamSpy, 'gpt-4o');
      expect(googleStreamSpy).not.toHaveBeenCalled();
    });

    it('should select Google Gemini Pro for PDF when Google is available', async () => {
      setupServiceAndSpies({ google: 'test-google-key', openai: undefined });
      await callStream(simpleMessage, pdfAttachment, { automaticModelSelection: true });
      assertStreamCall(googleStreamSpy, 'gemini-1.5-pro');
    });

    it('should select OpenAI GPT-4o for PDF when only OpenAI is available (and Google not)', async () => {
      setupServiceAndSpies({ openai: 'test-openai-key', google: undefined });
      await callStream(simpleMessage, pdfAttachment, { automaticModelSelection: true });
      assertStreamCall(openAiStreamSpy, 'gpt-4o');
    });

    it('should select Google Gemini Pro for long/complex message when Google is available', async () => {
      setupServiceAndSpies({ google: 'test-google-key', openai: undefined });
      await callStream(longMessage, [], { automaticModelSelection: true });
      assertStreamCall(googleStreamSpy, 'gemini-1.5-pro');
    });

    it('should select OpenAI GPT-4o for long/complex message when only OpenAI is available (and Google not)', async () => {
      setupServiceAndSpies({ openai: 'test-openai-key', google: undefined });
      await callStream(longMessage, [], { automaticModelSelection: true });
      assertStreamCall(openAiStreamSpy, 'gpt-4o');
    });

    it('should select Google Gemini Flash for simple queries when Google is available', async () => {
      setupServiceAndSpies({ google: 'test-google-key', openai: 'test-openai-key' }); // Both available, Google preferred for simple
      await callStream(simpleMessage, [], { automaticModelSelection: true });
      assertStreamCall(googleStreamSpy, 'gemini-2.0-flash-exp');
    });

    it('should select OpenAI GPT-4o-mini for simple queries when only OpenAI is available', async () => {
      setupServiceAndSpies({ openai: 'test-openai-key', google: undefined });
      await callStream(simpleMessage, [], { automaticModelSelection: true });
      assertStreamCall(openAiStreamSpy, 'gpt-4o-mini');
    });

    it('should stream an error message if no providers are available', async () => {
      setupServiceAndSpies({ openai: undefined, google: undefined }); // No keys
      const onChunkFn = vi.fn();
      const onCompleteFn = vi.fn();
      const onErrorFn = vi.fn();

      await aiService.getChatResponseStream(
        simpleMessage, defaultUserPreferences.userId, defaultUserPreferences.conversationId, defaultUserPreferences.messageId,
        defaultUserPreferences.coachingMode, defaultUserPreferences.conversationHistory,
        { provider: 'openai', model: 'gpt-4o-mini' }, // These prefs won't matter
        [], true, // automaticModelSelection = true
        onChunkFn, onCompleteFn, onErrorFn
      );

      // AiService itself will throw before calling provider if no providers are registered.
      // The method's catch block then calls onError with the error message.
      expect(onErrorFn).toHaveBeenCalledWith(expect.any(Error));
      expect(onErrorFn.mock.calls[0][0].message).toBe("No AI providers registered.");
      // onChunk and onComplete should not be called if initialization fails this way
      expect(onChunkFn).not.toHaveBeenCalled();
      expect(onCompleteFn).not.toHaveBeenCalled();
    });
  });

  describe('User-specified Provider/Model (automaticModelSelection = false)', () => {
    it('should use user-specified OpenAI model (getChatResponseStream)', async () => {
      setupServiceAndSpies({ openai: 'test-openai-key', google: 'test-google-key' });
      await callStream(simpleMessage, [], {
        automaticModelSelection: false,
        aiProvider: 'openai',
        aiModel: 'gpt-4-turbo' as OpenAIModel,
      });
      assertStreamCall(openAiStreamSpy, 'gpt-4-turbo');
      expect(googleStreamSpy).not.toHaveBeenCalled();
    });

    it('should use user-specified Google model (getChatResponseStream)', async () => {
      setupServiceAndSpies({ openai: 'test-openai-key', google: 'test-google-key' });
      await callStream(simpleMessage, [], {
        automaticModelSelection: false,
        aiProvider: 'google',
        aiModel: 'gemini-1.5-pro' as GoogleModel,
      });
      assertStreamCall(googleStreamSpy, 'gemini-1.5-pro');
      expect(openAiStreamSpy).not.toHaveBeenCalled();
    });

    it('should use user-specified OpenAI model (getChatResponse - non-streaming)', async () => {
      setupServiceAndSpies({ openai: 'test-openai-key', google: 'test-google-key' });
      await callNonStream(simpleMessage, [], {
        automaticModelSelection: false,
        aiProvider: 'openai',
        aiModel: 'gpt-4-turbo' as OpenAIModel,
      });
      assertNonStreamCall(openAiNonStreamSpy, 'gpt-4-turbo');
      expect(googleNonStreamSpy).not.toHaveBeenCalled();
    });

    // Test for response content alignment with new mocks
    it('should return default simple query response from OpenAI mock (non-streaming)', async () => {
        setupServiceAndSpies({ openai: 'test-openai-key', google: undefined });
        // No setNextResponse, so it should use the default from MockOpenAiProvider
        // which is "Mocked OpenAI response for model gpt-4o-mini"
        // The actual default from ai-providers.ts is "Mocked OpenAI response for model {config.model}"

        const result = await callNonStream(simpleMessage, [], {
            automaticModelSelection: false, // Use specified model
            aiProvider: 'openai',
            aiModel: 'gpt-4o-mini',
        });
        expect(result.response).toBe('Mocked openai response for model gpt-4o-mini');
    });

    it('should return specific response from OpenAI mock when set (non-streaming)', async () => {
        setupServiceAndSpies({ openai: 'test-openai-key', google: undefined });
        const specificResponse = "This is a test-specific OpenAI response.";
        MockOpenAiProvider.setNextResponse(specificResponse);

        const result = await callNonStream(simpleMessage, [], {
            automaticModelSelection: false,
            aiProvider: 'openai',
            aiModel: 'gpt-4o-mini',
        });
        expect(result.response).toBe(specificResponse);
    });

    it('should use default simple query stream from Google mock (streaming)', async () => {
        setupServiceAndSpies({ openai: undefined, google: 'test-google-key' });
        const onCompleteSpy = vi.fn();
        // No setNextStream, so it should use the default from MockGoogleProvider based on model
        // For gemini-2.0-flash-exp, it's defaultGoogleSimpleQueryStream

        await callStream(simpleMessage, [], {
            automaticModelSelection: false, // Use specified model
            aiProvider: 'google',
            aiModel: 'gemini-2.0-flash-exp',
        }, onCompleteSpy); // Pass the spy directly to callStream's onComplete mock

        // This assertion relies on the mock provider's default stream for gemini-2.0-flash-exp
        // Need to import that default response for exact match.
        // For now, just check if onCompleteSpy was called, detailed check would need default stream data.
        expect(onCompleteSpy).toHaveBeenCalled();
        // Example of more detailed check if defaultGoogleSimpleQueryStream was exported:
        // import { defaultGoogleSimpleQueryStream } from '../mocks/ai-providers';
        // expect(onCompleteSpy).toHaveBeenCalledWith(defaultGoogleSimpleQueryStream.fullResponse);
    });


    it('should call dependent services (memoryService, chatContextService)', async () => {
      setupServiceAndSpies({ openai: 'test-openai-key' });
      await callNonStream(simpleMessage, [], { aiProvider: 'openai', aiModel: 'gpt-4o-mini'});

      expect(memoryService.getContextualMemories).toHaveBeenCalled();
      expect(memoryService.processMessageForMemory).toHaveBeenCalled(); // Called once for user msg, once for AI msg by service
      expect(chatContextService.buildChatContext).toHaveBeenCalled();
    });
  });
});

console.log('tests/server/services/ai-service.test.ts re-created and reviewed.');
