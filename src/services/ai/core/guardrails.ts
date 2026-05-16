import { UserTier } from '../../../types';

export type FeatureName = 'DeepAnalysis' | 'DailyBrief' | 'QuickInsight' | 'ClinicalInsights';

export interface GuardrailResult {
  shouldTrigger: boolean;
  reason?: string;
}

export const shouldTriggerAI = (
  userTier: UserTier,
  maturityLevel: number | null | undefined,
  logsCount: number,
  logsInTimeframeCount: number,
  featureName: FeatureName | 'fix_missing_data' | 'fill_gaps',
  lastGeneratedDate: string | null
): GuardrailResult => {
  // Recovery Mode Override
  if (featureName === 'fix_missing_data' || featureName === 'fill_gaps') {
    return { shouldTrigger: true, reason: 'RECOVERY_MODE_ACTIVE' };
  }

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
      if (userTier === 'Basic') {
        return { shouldTrigger: false, reason: "Deep Analysis requires Enhanced or Pro tier." };
      }
      if (logsInTimeframeCount < 90) {
        return { shouldTrigger: false, reason: "Deep Analysis requires 90 logs in the last 5 months." };
      }
      break;
    case 'DailyBrief':
      if (logsCount < 6) {
        return { shouldTrigger: false, reason: `SIA is still calibrating. ${6 - logsCount} more logs needed for daily brief.` };
      }
      break;
    case 'QuickInsight':
      if (userTier === 'Basic') {
        return { shouldTrigger: false, reason: "Pattern Teaser requires Enhanced or Pro tier." };
      }
      if (logsInTimeframeCount < 14) {
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
