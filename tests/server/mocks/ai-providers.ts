import {
  AiProvider,
  AIProviderName,
  AvailableModels,
  AttachmentData,
  ChatMessage,
  ChatResponse,
  HealthInsightsResponse,
  ProviderConfig,
  ProviderChatMessage,
  ModelInfo,
  OpenAIModel,
  GoogleModel,
} from '../../../server/services/providers/ai-provider.interface'; // Adjust path as necessary

// --- Default Stream Definitions (as per Subtask 10 spec) ---
const defaultOpenAISimpleQueryStream = {
  chunks: [
    "To improve your sleep with OpenAI tech: ",
    "1. Use a sleep tracking app. ",
    "2. Try guided meditation via an audio app. ",
    "3. Consider a smart home device to regulate light and temperature. ",
    "Sweet dreams!",
  ],
  fullResponse: "To improve your sleep with OpenAI tech: 1. Use a sleep tracking app. 2. Try guided meditation via an audio app. 3. Consider a smart home device to regulate light and temperature. Sweet dreams!",
};

const defaultOpenAIImageQueryStream = {
  chunks: [
    "This image appears to be a healthy meal. ",
    "It contains grilled salmon, asparagus, and cherry tomatoes. ",
    "Nutritional estimate: ~380 calories, good source of protein and omega-3s.",
  ],
  fullResponse: "This image appears to be a healthy meal. It contains grilled salmon, asparagus, and cherry tomatoes. Nutritional estimate: ~380 calories, good source of protein and omega-3s.",
};

const defaultGoogleSimpleQueryStream = {
  chunks: [
    "Hello! ", "Improving sleep quality ", "is crucial for overall wellness. ",
    "Here are some evidence-based strategies:\n\n",
    "1. **Sleep Schedule**: Go to bed and wake up at the same time every day.\n",
    "2. **Sleep Environment**: Keep your bedroom cool (65-68°F), dark, and quiet.\n",
    "3. **Evening Routine**: Avoid screens 1-2 hours before bed, try reading or gentle stretching.\n",
    "4. **Limit Caffeine**: Avoid caffeine after 2 PM as it can stay in your system 6-8 hours.\n\n",
    "What time do you typically go to bed? ",
    "I can help create a personalized sleep schedule for you.",
  ],
  fullResponse: "Hello! Improving sleep quality is crucial for overall wellness. Here are some evidence-based strategies:\n\n1. **Sleep Schedule**: Go to bed and wake up at the same time every day.\n2. **Sleep Environment**: Keep your bedroom cool (65-68°F), dark, and quiet.\n3. **Evening Routine**: Avoid screens 1-2 hours before bed, try reading or gentle stretching.\n4. **Limit Caffeine**: Avoid caffeine after 2 PM as it can stay in your system 6-8 hours.\n\nWhat time do you typically go to bed? I can help create a personalized sleep schedule for you.",
};

const defaultGoogleImageQueryStream = {
  chunks: [
     "I see a beautifully ", "plated dish featuring ", "a piece of salmon, garnished with fresh dill. ",
     "The salmon is served with lemon slices underneath it. ",
     "Next to the salmon, there are green asparagus spears and halved cherry tomatoes.\n\n",
     "From a nutritional standpoint, this is an excellent meal choice:\n\n",
     "- **Salmon**: Rich in omega-3 fatty acids, high-quality protein (~25g per 4oz serving)\n",
     "- **Asparagus**: Low calorie, high in fiber, folate, and vitamins A, C, K\n",
     "- **Cherry tomatoes**: Antioxidants (lycopene), vitamin C\n",
     "- **Lemon**: Vitamin C, helps with iron absorption\n\n",
     "Estimated calories: approximately 350-400 calories for this balanced, ",
     "nutrient-dense meal.",
  ],
  fullResponse: "I see a beautifully plated dish featuring a piece of salmon, garnished with fresh dill. The salmon is served with lemon slices underneath it. Next to the salmon, there are green asparagus spears and halved cherry tomatoes.\n\nFrom a nutritional standpoint, this is an excellent meal choice:\n\n- **Salmon**: Rich in omega-3 fatty acids, high-quality protein (~25g per 4oz serving)\n- **Asparagus**: Low calorie, high in fiber, folate, and vitamins A, C, K\n- **Cherry tomatoes**: Antioxidants (lycopene), vitamin C\n- **Lemon**: Vitamin C, helps with iron absorption\n\nEstimated calories: approximately 350-400 calories for this balanced, nutrient-dense meal.",
};


class BaseMockProvider implements AiProvider {
  public providerName: AIProviderName;
  private static specificMockResponse: string | null = null;
  private static specificMockStream: { chunks: string[], fullResponse: string } | null = null;

  constructor(name: AIProviderName) {
    this.providerName = name;
  }

  public static setNextResponse(response: string | null) {
    BaseMockProvider.specificMockResponse = response;
  }

  public static setNextStream(streamData: { chunks: string[], fullResponse: string } | null) {
    BaseMockProvider.specificMockStream = streamData;
  }

  public static resetMocks() {
    BaseMockProvider.specificMockResponse = null;
    BaseMockProvider.specificMockStream = null;
  }

  async generateChatResponse(
    messages: ProviderChatMessage[],
    config: ProviderConfig,
    attachments?: AttachmentData[]
  ): Promise<ChatResponse> {
    if (BaseMockProvider.specificMockResponse !== null) {
      const response = BaseMockProvider.specificMockResponse;
      // BaseMockProvider.specificMockResponse = null; // Consume after use
      return { response };
    }
    return { response: `Mocked ${this.providerName} response for model ${config.model}` };
  }

  async generateChatResponseStream(
    messages: ProviderChatMessage[],
    config: ProviderConfig,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string) => void,
    onError: (error: Error) => void,
    attachments?: AttachmentData[]
  ): Promise<void> {
    let streamData = BaseMockProvider.specificMockStream;
    // BaseMockProvider.specificMockStream = null; // Consume after use

    if (!streamData) {
      // Select default stream based on provider and model type (simple vs image)
      const isImageModel = config.model.includes('vision') || config.model.includes('gpt-4o') || config.model.includes('gemini-1.5-pro'); // Simplified check
      if (this.providerName === 'openai') {
        streamData = isImageModel ? defaultOpenAIImageQueryStream : defaultOpenAISimpleQueryStream;
      } else { // google
        streamData = isImageModel ? defaultGoogleImageQueryStream : defaultGoogleSimpleQueryStream;
      }
    }

    const { chunks, fullResponse } = streamData;

    for (let i = 0; i < chunks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 5)); // Simulate network delay
      onChunk(chunks[i]);
    }
    await new Promise(resolve => setTimeout(resolve, 5));
    onComplete(fullResponse);
  }

  async generateHealthInsights(
    healthData: any,
    config: ProviderConfig
  ): Promise<HealthInsightsResponse> {
    return { insights: [`Mocked ${this.providerName} health insight for model ${config.model}`] };
  }

  getAvailableModels(): AvailableModels {
    // Based on "Available Models API Response" section from the specification
    if (this.providerName === 'openai') {
      return {
        openai: [
          { id: "gpt-4o", name: "GPT-4o", description: "Latest, most capable model (multimodal)" },
          { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast, cost-effective model for general tasks" },
          { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "High-performance model for complex tasks" }
        ]
      };
    }
    if (this.providerName === 'google') {
      return {
        google: [
          { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Most capable model for complex multimodal tasks" },
          { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash Exp", description: "Fast, cost-effective model for general tasks" }
        ]
      };
    }
    return {};
  }
}

export class MockOpenAiProvider extends BaseMockProvider {
  constructor() {
    super('openai');
  }
  // OpenAI specific overrides can go here if needed
}

export class MockGoogleProvider extends BaseMockProvider {
  constructor() {
    super('google');
  }
  // Google specific overrides can go here if needed
}

// Helper to reset mocks for all providers if needed from a central place in tests
export const resetAllProviderMocks = () => {
  BaseMockProvider.resetMocks();
};
