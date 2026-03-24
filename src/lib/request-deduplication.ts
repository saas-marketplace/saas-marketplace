/**
 * Request Deduplication Utility
 * Prevents duplicate network requests by caching fetch promises
 */

// Global cache for deduplicating requests
const requestCache = new Map<string, Promise<unknown>>();

/**
 * Fetch a resource only once - subsequent calls return the cached promise
 * @param key Unique identifier for the request
 * @param fn Function that returns a Promise (the actual fetch)
 * @returns The result of the fetch
 * 
 * @example
 * const data = await fetchOnce('users-list', () => 
 *   fetch('/api/users').then(r => r.json())
 * );
 */
export async function fetchOnce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (requestCache.has(key)) {
    return requestCache.get(key) as Promise<T>;
  }

  const promise = fn() as Promise<unknown>;
  requestCache.set(key, promise);

  try {
    return await promise as unknown as T;
  } catch (error) {
    // Remove from cache on error so retry is possible
    requestCache.delete(key);
    throw error;
  }
}

/**
 * Clear cached request(s)
 * @param key Optional key - if provided, clears only that key; otherwise clears all
 */
export function clearCache(key?: string): void {
  if (key) {
    requestCache.delete(key);
  } else {
    requestCache.clear();
  }
}

/**
 * Check if a request is currently in progress
 * @param key The request key to check
 */
export function isRequestPending(key: string): boolean {
  return requestCache.has(key);
}

export default fetchOnce;