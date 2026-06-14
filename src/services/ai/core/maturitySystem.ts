import { 
  db, 
  collection, 
  query, 
  where, 
  getCountFromServer,
  doc, 
  getDoc 
} from "../../../lib/firebase";
import { handleFirestoreError, OperationType } from "../../../lib/errorHandling";

export type MaturityLevel = 1 | 2 | 3 | 4;

export interface MaturityInfo {
  level: MaturityLevel;
  count: number;
  label: string;
  nextThreshold: number;
}

export const MATURITY_THRESHOLDS = {
  BASELINE: 0,   // Level 1: 0-6 logs
  TRENDS: 7,     // Level 2: 7-13 logs
  DEEP_ANALYSIS: 14, // Level 3: 14-89 logs
  ADVANCED: 90   // Level 4: 90+ logs
};

export const MATURITY_LABELS = {
  [1]: 'Baseline',
  [2]: 'Trends',
  [3]: 'Deep Analysis',
  [4]: 'Advanced Diagnostic'
};

export class MaturitySystem {
  static getNextThreshold(count: number): number {
    if (count >= MATURITY_THRESHOLDS.ADVANCED) return MATURITY_THRESHOLDS.ADVANCED;
    if (count >= MATURITY_THRESHOLDS.DEEP_ANALYSIS) return MATURITY_THRESHOLDS.ADVANCED;
    if (count >= MATURITY_THRESHOLDS.TRENDS) return MATURITY_THRESHOLDS.DEEP_ANALYSIS;
    return MATURITY_THRESHOLDS.TRENDS;
  }

  static getLevel(count: number): MaturityLevel {
    if (count >= MATURITY_THRESHOLDS.ADVANCED) return 4;
    if (count >= MATURITY_THRESHOLDS.DEEP_ANALYSIS) return 3;
    if (count >= MATURITY_THRESHOLDS.TRENDS) return 2;
    return 1;
  }

  static parseCount(count: number): MaturityInfo {
    const level = this.getLevel(count);
    return {
      level,
      count,
      label: MATURITY_LABELS[level],
      nextThreshold: this.getNextThreshold(count)
    };
  }

  static async getUserDataMaturity(userId: string): Promise<MaturityInfo> {
    try {
      if (!db) throw new Error('Firestore not initialized');
      const userSnap = await getDoc(doc(db, 'users', userId));
      const userData = userSnap.data();
      
      const logsRef = collection(db, 'users', userId, 'sleep_logs');
      const countSnapshot = await getCountFromServer(logsRef);
      const actualCount = countSnapshot.data().count;

      if (userData?.levelOverride) {
        const level: MaturityLevel = userData.levelOverride;
        return {
          level,
          count: actualCount,
          label: MATURITY_LABELS[level],
          nextThreshold: level === 4 ? 90 : level === 3 ? 90 : level === 2 ? 14 : 7,
        };
      }

      return this.parseCount(actualCount);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      return this.parseCount(0);
    }
  }

  static canAccessFeature(count: number, requiredLevel: MaturityLevel): boolean {
    return this.getLevel(count) >= requiredLevel;
  }

  static getInsightDepth(level: MaturityLevel): string {
    switch (level) {
      case 4: return "Provide an advanced clinical sleep diagnostic analysis. Include rolling metrics, deep multifactor correlations, and highly personalized longitudinal recovery metrics. This is for an expert user.";
      case 3: return "Provide deep multi-factor correlation analysis. Uncover specific behavioral and environmental triggers affecting sleep quality over a sustained multi-week period.";
      case 2: return "Provide trend-based analysis. Identify common factors between the best and worst nights over the week and note sleep consistency issues.";
      case 1:
      default: return "Provide surface-level reflection. Summarize recent individual logs and state that continued daily logging is required to unlock pattern recognition.";
    }
  }

  static getPromptComplexity(level: MaturityLevel): string {
    switch (level) {
      case 4: return "clinical expert analysis context";
      case 3: return "advanced multi-factor analysis context";
      case 2: return "weekly trend analysis context";
      case 1:
      default: return "basic daily reflection context";
    }
  }

  static getAvailableAIFeatures(level: MaturityLevel): string[] {
    const features = ["chat", "dailyBrief"];
    if (level >= 2) {
      features.push("patternTeaser");
    }
    if (level >= 3) {
      features.push("patternDecoder", "deepAnalysis", "chatAnalysis");
    }
    if (level >= 4) {
      features.push("advancedDiagnostics");
    }
    return features;
  }

  static getTeaserRules(level: MaturityLevel): string {
    if (level < 2) return "Not enough data for teasing patterns. State that more logging is required.";
    return "Limit teaser to exactly 5 sentences. Hint at correlations without fully resolving them. End with a call to action to use pattern decoder.";
  }
}
