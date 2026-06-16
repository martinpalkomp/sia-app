export const AI_CAPABILITIES = {
  chronotype: {
    name: 'chronotype',
    requiredFields: ['bedtime', 'wakeTime'],
    isAvailableInPipeline: false,
    keywords: ['chronotype', 'early bird', 'night owl', 'time i go to bed', 'bedtime', 'wake time']
  },
  awakenings: {
    name: 'awakenings',
    requiredFields: ['sleepEvents'],
    isAvailableInPipeline: false,
    keywords: ['awakenings', 'waking up', 'interruption', 'wake up during', 'middle of the night', 'explains my awakenings']
  },
  alcoholCorrelation: {
    name: 'alcohol correlation',
    requiredFields: ['alcohol', 'sleepQuality'],
    isAvailableInPipeline: true,
    keywords: ['alcohol', 'drink', 'beer', 'wine']
  },
  durationCorrelation: {
    name: 'duration correlation',
    requiredFields: ['duration', 'sleepQuality'],
    isAvailableInPipeline: true,
    keywords: ['duration', 'how long']
  }
};

export const canAnalyze = (topic: keyof typeof AI_CAPABILITIES): { allowed: boolean; reason?: string } => {
  const cap = AI_CAPABILITIES[topic];
  if (!cap) return { allowed: true };
  
  if (!cap.isAvailableInPipeline) {
    const fields = cap.requiredFields.join(' and ');
    return {
      allowed: false,
      reason: `I cannot evaluate ${cap.name} because ${fields} data are unavailable in the current analysis pipeline.`
    };
  }
  
  return { allowed: true };
};

export const detectUnavailableCapabilities = (text: string): string | null => {
  const lowerText = text.toLowerCase();
  
  for (const [key, cap] of Object.entries(AI_CAPABILITIES)) {
    if (!cap.isAvailableInPipeline) {
      if (cap.keywords.some(kw => lowerText.includes(kw))) {
        const result = canAnalyze(key as keyof typeof AI_CAPABILITIES);
        if (!result.allowed) return result.reason || null;
      }
    }
  }
  
  return null;
};
