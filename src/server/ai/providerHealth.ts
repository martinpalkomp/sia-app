let isHealthy = true;
let lastCheck = Date.now();

export const checkProviderHealth = () => {
  return {
    isHealthy,
    lastCheck,
    status: isHealthy ? 'OPERATIONAL' : 'DEGRADED',
  };
};

export const reportProviderError = () => {
  isHealthy = false;
  lastCheck = Date.now();
  // Gradually recover after 5 minutes
  setTimeout(() => {
    isHealthy = true;
  }, 5 * 60 * 1000);
};
