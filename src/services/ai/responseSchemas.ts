export interface StructuredInsight {
  type: "Pattern" | "Recommendation" | "Alert" | "Summary" | "Brief";
  category: "Circadian" | "Environment" | "Substance" | "Activity" | "Consistency" | "General";
  confidence: number;
  summary: string;
  recommendation?: string;
  evidence?: string[];
  severity: "low" | "medium" | "high";
  requiresFollowup: boolean;
}

export interface PatternTeaserResponse {
  pattern: string;
  correlation: string;
  factor: string;
  metric: string;
  confidence: number;
}

export interface DailyBriefResponse {
  briefing: string[];
  recommendation?: string;
  vitalityDelta?: number;
}

export interface DeepAnalysisResponse {
  summary: string;
  recommendation: string;
  confidence: number;
  keyInsights: string[];
}
