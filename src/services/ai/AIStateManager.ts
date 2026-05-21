import { getCachedDailyBrief, generateDailyBrief } from './dailyBrief';
import { generatePatternTeaser } from './patternTeaser';
import { DailyLog, UserProfile } from '../../types';

export class AIStateManager {
  
  static invalidateCache(userId: string, targetDate: string) {
    sessionStorage.removeItem(`sia_brief_${userId}_${targetDate}`);
    sessionStorage.removeItem(`sia_insight_${userId}_${targetDate}`);
  }

  static async syncDailyBrief(
    userId: string,
    targetDate: string,
    lastNightStr: string,
    logs: DailyLog[],
    userProfile: UserProfile,
    maturityLevel: number
  ): Promise<string | null> {
    const briefCacheKey = `sia_brief_${userId}_${targetDate}`;
    const cached = sessionStorage.getItem(briefCacheKey);
    if (cached) return cached;

    const globalCached = await getCachedDailyBrief(userId, targetDate);
    if (globalCached) {
      const contentStr = typeof globalCached === 'string' ? globalCached : (globalCached.summary + (globalCached.recommendation ? "\n\n" + globalCached.recommendation : ""));
      sessionStorage.setItem(briefCacheKey, contentStr);
      return contentStr;
    }

    const tier = userProfile.tier || 'Basic';
    const freshBrief = await generateDailyBrief(
      userId,
      logs,
      tier as any,
      targetDate,
      lastNightStr,
      maturityLevel
    );

    const contentStr = typeof freshBrief === 'string' ? freshBrief : (freshBrief.summary + (freshBrief.recommendation ? "\n\n" + freshBrief.recommendation : ""));
    
    if (contentStr && !contentStr.toLowerCase().includes("no brief available")) {
      sessionStorage.setItem(briefCacheKey, contentStr);
      return contentStr;
    }

    return null;
  }

  static async syncPatternInsight(
    userId: string,
    targetDate: string,
    logs: DailyLog[],
    userProfile: UserProfile,
    maturityLevel: number
  ): Promise<string | null> {
    const insightCacheKey = `sia_insight_${userId}_${targetDate}`;
    const cached = sessionStorage.getItem(insightCacheKey);
    if (cached) return cached;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const logsInLastMonthCount = logs.filter(log => new Date(log.date) >= thirtyDaysAgo).length;

    const tier = userProfile.tier || 'Basic';
    const generatedTeaser = await generatePatternTeaser(logs, tier as any, logsInLastMonthCount, maturityLevel);

    const contentStr = typeof generatedTeaser === 'string' ? generatedTeaser : `PATTERN: ${generatedTeaser.summary}\nSUPPORTING SIGNALS:\n${generatedTeaser.evidence.join('\n')}\n\n***\n\nClinical and behavioral guidelines are not a replacement for professional healthcare. Consult a credentialed practitioner for medical diagnosis or treatment protocols.`;

    if (contentStr && !contentStr.includes("Unable to generate") && !contentStr.includes("Pattern unavailable")) {
      sessionStorage.setItem(insightCacheKey, contentStr);
      return contentStr;
    }

    return null;
  }
}
