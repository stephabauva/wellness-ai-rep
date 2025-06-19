import { API_CONFIG } from '../config/api';

/**
 * @interface RequestOptions
 * @extends RequestInit
 * @property {number} [timeout] - Optional timeout in milliseconds for the request.
 */
interface RequestOptions extends RequestInit {
  timeout?: number;
}

/**
 * Handles the response from a fetch request.
 * Clears the timeout, checks for non-ok responses, and parses JSON.
 * @template T - The expected type of the JSON response.
 * @param {Response} response - The Response object from a fetch call.
 * @param {NodeJS.Timeout} timeoutId - The ID of the timeout timer to clear.
 * @returns {Promise<T>} A promise that resolves with the parsed JSON response.
 * @throws {Error} If the API request fails or returns a non-ok status.
 */
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

/**
 * Performs a GET request to a specified API endpoint.
 * @template T - The expected type of the JSON response. Defaults to `any`.
 * @param {string} endpoint - The API endpoint to fetch data from (e.g., 'users').
 * @param {RequestOptions} [options={}] - Optional fetch request options, including timeout.
 * @returns {Promise<T>} A promise that resolves with the JSON response.
 * @throws {Error} If the API request fails, times out, or returns a non-ok status.
 */
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

/**
 * Performs a POST request to a specified API endpoint with a JSON body.
 * @template T - The expected type of the JSON response. Defaults to `any`.
 * @param {string} endpoint - The API endpoint to post data to (e.g., 'users').
 * @param {any} body - The data to be sent in the request body (will be JSON.stringify-ed).
 * @param {RequestOptions} [options={}] - Optional fetch request options, including timeout.
 * @returns {Promise<T>} A promise that resolves with the JSON response.
 * @throws {Error} If the API request fails, times out, or returns a non-ok status.
 */
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

/**
 * Performs a PUT request to a specified API endpoint with a JSON body.
 * @template T - The expected type of the JSON response. Defaults to `any`.
 * @param {string} endpoint - The API endpoint to update data at (e.g., 'users/1').
 * @param {any} body - The data to be sent in the request body (will be JSON.stringify-ed).
 * @param {RequestOptions} [options={}] - Optional fetch request options, including timeout.
 * @returns {Promise<T>} A promise that resolves with the JSON response.
 * @throws {Error} If the API request fails, times out, or returns a non-ok status.
 */
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

/**
 * Performs a PATCH request to a specified API endpoint with a JSON body.
 * @template T - The expected type of the JSON response. Defaults to `any`.
 * @param {string} endpoint - The API endpoint to partially update data at (e.g., 'users/1').
 * @param {any} body - The data to be sent in the request body (will be JSON.stringify-ed).
 * @param {RequestOptions} [options={}] - Optional fetch request options, including timeout.
 * @returns {Promise<T>} A promise that resolves with the JSON response.
 * @throws {Error} If the API request fails, times out, or returns a non-ok status.
 */
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

/**
 * Performs a DELETE request to a specified API endpoint.
 * @template T - The expected type of the JSON response (often null or a confirmation message). Defaults to `any`.
 * @param {string} endpoint - The API endpoint to delete a resource from (e.g., 'users/1').
 * @param {RequestOptions} [options={}] - Optional fetch request options, including timeout.
 * @returns {Promise<T>} A promise that resolves with the JSON response.
 * @throws {Error} If the API request fails, times out, or returns a non-ok status.
 */
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

// as it requires different headers (no 'Content-Type': 'application/json').
/**
 * Performs a POST request with FormData to a specified API endpoint.
 * Useful for file uploads. Content-Type header should NOT be set manually for FormData.
 * @template T - The expected type of the JSON response. Defaults to `any`.
 * @param {string} endpoint - The API endpoint to post FormData to (e.g., 'upload').
 * @param {FormData} formData - The FormData object to send.
 * @param {RequestOptions} [options={}] - Optional fetch request options, including timeout.
 * @returns {Promise<T>} A promise that resolves with the JSON response.
 * @throws {Error} If the API request fails, times out, or returns a non-ok status.
 */
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
