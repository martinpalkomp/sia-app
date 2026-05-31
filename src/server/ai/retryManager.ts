export async function withRetry<T>(
  operation: (model: string) => Promise<T>,
  getModelFn: (attempt: number) => Promise<string>,
  maxAttempts = 3
): Promise<{ result: T; usedModel: string; attempt: number }> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const modelToUse = await getModelFn(attempt);
    try {
      const result = await operation(modelToUse);
      return { result, usedModel: modelToUse, attempt: attempt + 1 };
    } catch (error: any) {
      lastError = error;
      
      const status = error.status || error.code || error.cause?.code;
      const isNetworkError = 
        error.name === 'AbortError' || 
        error.name === 'FetchError' || 
        status === 'ETIMEDOUT' || 
        status === 'ENOTFOUND' ||
        status === 'ECONNRESET' ||
        error.message?.toLowerCase().includes('fetch failed') ||
        error.message?.toLowerCase().includes('network endpoint');

      // If error is related to model not found, overloaded, rate limited or network failure
      if (status === 404 || status === 503 || status === 429 || isNetworkError) {
        console.warn(`[RetryManager] Model ${modelToUse} failed (Reason: ${status || error.message}). Retrying (Attempt ${attempt + 1}/${maxAttempts})...`);
        continue;
      }
      throw error; // Throw other errors immediately
    }
  }
  
  throw lastError;
}
