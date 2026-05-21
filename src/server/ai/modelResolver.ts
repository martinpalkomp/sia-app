export const getPreferredModel = (): string => {
  return process.env.SIA_AI_MODEL || 'gemini-2.0-flash-001';
};

export const getFallbackModel = (): string => {
  return process.env.SIA_FALLBACK_MODEL || 'gemini-1.5-flash';
};
