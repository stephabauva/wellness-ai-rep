import { useQuery } from '@tanstack/react-query';

// Define the structure for an AI model
export interface AiModelInfo {
  id: string;
  name: string;
  description: string;
  // Potentially add provider field if not nested
}

// Define the structure for available AI models (nested by provider)
export interface AvailableAiModels {
  openai?: AiModelInfo[];
  google?: AiModelInfo[];
  // Add other providers as needed
}

export function useAiModels() {
  const {
    data: aiModels,
    isLoading: isLoadingAiModels,
    error: aiModelsError
  } = useQuery<AvailableAiModels>({
    queryKey: ['aiModels', '/api/ai-models'], // Unique queryKey
    queryFn: async () => {
      const response = await fetch('/api/ai-models');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch AI models' }));
        throw new Error(errorData.message || 'Failed to fetch AI models');
      }
      return await response.json();
    },
    // Options like staleTime could be added if model list doesn't change often
    // staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    aiModels,
    isLoadingAiModels,
    aiModelsError,
  };
}
