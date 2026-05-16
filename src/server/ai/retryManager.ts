export async function withRetry<T>(
  operation: (model: string) => Promise<T>,
  primaryModel: string,
  fallbackModel: string,
  maxAttempts = 2
): Promise<{ result: T; usedModel: string; attempt: number }> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const modelToUse = attempt === 0 ? primaryModel : fallbackModel;
    try {
      const result = await operation(modelToUse);
      return { result, usedModel: modelToUse, attempt: attempt + 1 };
    } catch (error: any) {
      lastError = error;
      // If error is related to model not found or overloaded, or rate limited
      if (error.status === 404 || error.status === 503 || error.status === 429) {
        console.warn(`[RetryManager] Model ${modelToUse} failed (status ${error.status}). Retrying...`);
        continue;
      }
      throw error; // Throw other errors immediately
    }
  }
  
  throw lastError;
}
