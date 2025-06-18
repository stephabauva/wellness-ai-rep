import { useQuery } from '@tanstack/react-query';
// import { API_CONFIG } from '../config/api'; // No longer needed directly
import { getFromApi } from '../services/apiClient'; // Import apiClient function

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
    queryKey: ['aiModels', '/api/ai-models'],
    queryFn: () => getFromApi<AvailableAiModels>('ai-models'), // Use getFromApi
    // Options like staleTime could be added if model list doesn't change often
    // staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    aiModels,
    isLoadingAiModels,
    aiModelsError,
  };
}
