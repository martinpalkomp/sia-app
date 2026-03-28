import { UserTier } from '../types';

export type FeatureName = 'DeepAnalysis' | 'DailyBrief' | 'QuickInsight';

export interface GuardrailResult {
  shouldTrigger: boolean;
  reason?: string;
}

export const shouldTriggerAI = (
  userTier: UserTier,
  maturityLevel: number | null | undefined,
  logsCount: number,
  featureName: FeatureName,
  lastGeneratedDate: string | null
): GuardrailResult => {
  // Safety Gate (ARCH-02 Fix): Deny by Default
  if (maturityLevel === null || maturityLevel === undefined) {
    return { shouldTrigger: false, reason: "SIA is still calibrating." };
  }

  const today = new Date().toISOString().split('T')[0];
  if (lastGeneratedDate === today) {
    return { shouldTrigger: false, reason: "Already generated today." };
  }

  switch (featureName) {
    case 'DeepAnalysis':
      if (userTier !== 'Pro' || maturityLevel < 3) {
        return { shouldTrigger: false, reason: "Deep Analysis requires Pro tier and 90 days of data." };
      }
      break;
    case 'DailyBrief':
      if (logsCount < 3) {
        return { shouldTrigger: false, reason: `SIA is still calibrating. ${3 - logsCount} more logs needed for daily brief.` };
      }
      break;
    case 'QuickInsight':
      if (maturityLevel < 2) {
        return { shouldTrigger: false, reason: "SIA is still calibrating. 14 days of data needed for AI insights." };
      }
      break;
  }

  return { shouldTrigger: true };
};
