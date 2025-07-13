import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";

/**
 * API client service for making HTTP requests and managing React Query
 * @used-by settings, shared/hooks, memory, unknown/needs-classification
 */

function getApiBaseUrl(): string {
  // For native mobile apps, use the production server URL
  if (Capacitor.isNativePlatform()) {
    // You'll need to replace this with your actual server URL when deploying
    return 'http://localhost:5000';
  }
  
  // For web development, use relative URLs (handled by Vite proxy)
  return '';
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export const apiRequest = async (url: string, method: string, data?: any) => {
  // Get the correct base URL for mobile environments
  const baseUrl = getApiBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for session management
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(fullUrl, config);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // Handle 204 No Content responses (common for DELETE operations)
  if (response.status === 204) {
    return null;
  }

  // Check if response has content before parsing as JSON
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const responseData = await response.json();
    console.log('API Response data:', responseData);
    return responseData;
  }

  return null;
};

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiBaseUrl();
    const url = queryKey[0] as string;
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Section-specific cache strategies for lazy loading optimization
const sectionCacheConfig = {
  chat: { staleTime: 0 }, // Always fresh for real-time chat
  settings: { staleTime: 30 * 60 * 1000 }, // 30 minutes for settings
  'memory-overview': { staleTime: 2 * 60 * 1000 }, // 2 minutes for memory overview
  health: { staleTime: 5 * 60 * 1000 }, // 5 minutes for health data
  files: { staleTime: 1 * 60 * 1000 }, // 1 minute for files
  devices: { staleTime: 5 * 60 * 1000 }, // 5 minutes for devices
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes default
      gcTime: 10 * 60 * 1000, // 10 minutes cache retention (renamed from cacheTime in v5)
      retry: 1, // Allow one retry for transient failures
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnMount: 'always', // Only for active sections
    },
    mutations: {
      retry: 1, // Allow one retry for mutations too
      retryDelay: 1000,
    },
  },
});

// Helper function to get section-specific cache time
export const getSectionCacheTime = (endpoint: string): number => {
  if (endpoint.includes('/api/settings') || endpoint.includes('/ai-models')) {
    return sectionCacheConfig.settings.staleTime;
  }
  if (endpoint.includes('/api/memories')) {
    return sectionCacheConfig['memory-overview'].staleTime;
  }
  if (endpoint.includes('/api/health-data') || endpoint.includes('/api/health-consent')) {
    return sectionCacheConfig.health.staleTime;
  }
  if (endpoint.includes('/api/files') || endpoint.includes('/api/categories') || endpoint.includes('/api/retention-settings')) {
    return sectionCacheConfig.files.staleTime;
  }
  if (endpoint.includes('/api/devices')) {
    return sectionCacheConfig.devices.staleTime;
  }
  return 5 * 60 * 1000; // Default 5 minutes
};