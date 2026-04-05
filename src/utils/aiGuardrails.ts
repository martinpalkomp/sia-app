import { UserTier } from '../types';

export type FeatureName = 'DeepAnalysis' | 'DailyBrief' | 'QuickInsight' | 'ClinicalInsights';

export interface GuardrailResult {
  shouldTrigger: boolean;
  reason?: string;
}

export const shouldTriggerAI = (
  userTier: UserTier,
  maturityLevel: number | null | undefined,
  logsCount: number,
  logsInLastMonthCount: number,
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
      if ((userTier === 'Basic') || maturityLevel < 3) {
        return { shouldTrigger: false, reason: "Deep Analysis requires Enhanced or Pro tier and 90 days of data." };
      }
      break;
    case 'DailyBrief':
      if (logsCount < 3) {
        return { shouldTrigger: false, reason: `SIA is still calibrating. ${3 - logsCount} more logs needed for daily brief.` };
      }
      break;
    case 'QuickInsight':
      if (logsInLastMonthCount < 14) {
        return { shouldTrigger: false, reason: "SIA is still calibrating. 14 days of data throughout the last month needed for AI insights." };
      }
      break;
    case 'ClinicalInsights':
      if (userTier === 'Basic') {
        return { shouldTrigger: false, reason: "Clinical Insights require Enhanced or PRO tier." };
      }
      break;
  }

  return { shouldTrigger: true };
};
