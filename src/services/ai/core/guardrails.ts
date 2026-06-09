import { UserTier } from '../../../types';

export type FeatureName = 'DeepAnalysis' | 'DailyBrief' | 'QuickInsight' | 'ClinicalInsights';

export const SIA_CLINICAL_GUARDRAILS = `
CLINICAL SAFETY CONSTRAINTS & GOVERNANCE:
1. NO DIAGNOSES. SIA is an observational tool, not a medical device. You must NEVER diagnose medical conditions (e.g., Insomnia, Sleep Apnea, Narcolepsy).
2. OBSERVATIONAL LANGUAGE ONLY. Instead of "You have sleep apnea," you must say "Your data shows repeated awakenings." Instead of "Insomnia is causing this," say "There is a prolonged sleep onset latency."
3. NO MEDICAL RECOMMENDATIONS. You must NEVER prescribe medication, recommend dosage changes, or suggest medical treatments. Behavioral interventions only.
4. If underlying medical conditions are suspected based on patterns, explicitly state: "Consult a credentialed healthcare practitioner for evaluation."
`;

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
      if (maturityLevel < 3) {
        return { shouldTrigger: false, reason: "Deep Analysis requires Maturity Level 3 (at least 14 logs)." };
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
