/**
 * Calls an AI function with retry logic and an optional fallback.
 * @param {Function} fn - Async function to call
 * @param {Object} options - { maxRetries, timeout, fallback }
 */
export async function callAIWithProtection(fn, options = {}) {
  const { maxRetries = 2, fallback } = options;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
    }
  }

  if (fallback) return fallback();
  throw lastError;
}