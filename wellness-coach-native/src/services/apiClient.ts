import { API_CONFIG } from '../config/api';

interface RequestOptions extends RequestInit {
  timeout?: number; // Optional timeout in milliseconds
}

async function handleResponse<T>(response: Response, timeoutId: NodeJS.Timeout): Promise<T> {
  clearTimeout(timeoutId);
  if (!response.ok) {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorBody.error || errorMessage;
    } catch (e) {
      // Ignore if response body is not JSON or cannot be parsed
    }
    throw new Error(errorMessage);
  }
  // Handle cases where response might be empty (e.g., 204 No Content)
  if (response.status === 204) {
    return null as T; // Or undefined, depending on desired contract
  }
  return response.json() as Promise<T>;
}

function handleError(error: any, timeoutId: NodeJS.Timeout, timeoutValue: number): never {
  clearTimeout(timeoutId);
  if (error instanceof Error && error.name === 'AbortError') {
    throw new Error(`Request timed out after ${timeoutValue}ms`);
  }
  throw error;
}

export async function getFromApi<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeout = API_CONFIG.timeout, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/${endpoint}`, {
      ...fetchOptions,
      method: 'GET', // Explicitly set method
      headers: {
        ...API_CONFIG.defaultHeaders,
        ...fetchOptions.headers,
      },
      signal: controller.signal,
    });
    return await handleResponse<T>(response, timeoutId);
  } catch (error) {
    handleError(error, timeoutId, timeout);
  }
}

export async function postToApi<T = any>(endpoint: string, body: any, options: RequestOptions = {}): Promise<T> {
  const { timeout = API_CONFIG.timeout, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(body),
      ...fetchOptions,
      headers: {
        ...API_CONFIG.defaultHeaders,
        'Content-Type': 'application/json', // Ensure correct content type for JSON
        ...fetchOptions.headers,
      },
      signal: controller.signal,
    });
    return await handleResponse<T>(response, timeoutId);
  } catch (error) {
    handleError(error, timeoutId, timeout);
  }
}

export async function putToApi<T = any>(endpoint: string, body: any, options: RequestOptions = {}): Promise<T> {
  const { timeout = API_CONFIG.timeout, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/${endpoint}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...fetchOptions,
      headers: {
        ...API_CONFIG.defaultHeaders,
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      signal: controller.signal,
    });
    return await handleResponse<T>(response, timeoutId);
  } catch (error) {
    handleError(error, timeoutId, timeout);
  }
}

export async function patchToApi<T = any>(endpoint: string, body: any, options: RequestOptions = {}): Promise<T> {
  const { timeout = API_CONFIG.timeout, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/${endpoint}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...fetchOptions,
      headers: {
        ...API_CONFIG.defaultHeaders,
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      signal: controller.signal,
    });
    return await handleResponse<T>(response, timeoutId);
  } catch (error) {
    handleError(error, timeoutId, timeout);
  }
}

export async function deleteFromApi<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeout = API_CONFIG.timeout, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/${endpoint}`, {
      method: 'DELETE',
      ...fetchOptions,
      headers: {
        ...API_CONFIG.defaultHeaders,
        ...fetchOptions.headers,
      },
      signal: controller.signal,
    });
    return await handleResponse<T>(response, timeoutId);
  } catch (error) {
    handleError(error, timeoutId, timeout);
  }
}

// TODO: RN-Adapt - Add a specific function for FormData uploads if needed,
// as it requires different headers (no 'Content-Type': 'application/json').
export async function postFormDataToApi<T = any>(endpoint: string, formData: FormData, options: RequestOptions = {}): Promise<T> {
  const { timeout = API_CONFIG.timeout, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/${endpoint}`, {
      method: 'POST',
      body: formData,
      ...fetchOptions,
      headers: {
        // DO NOT set Content-Type for FormData, browser/fetch will do it with correct boundary.
        // ...API_CONFIG.defaultHeaders, // Spread default headers carefully
        ...(API_CONFIG.defaultHeaders['Authorization'] && {'Authorization': API_CONFIG.defaultHeaders['Authorization']}), // Example if you have Auth header
        ...fetchOptions.headers,
      },
      signal: controller.signal,
    });
    return await handleResponse<T>(response, timeoutId);
  } catch (error) {
    handleError(error, timeoutId, timeout);
  }
}
