import { getCachedDailyBrief, generateDailyBrief } from './dailyBrief';
import { generatePatternTeaser } from './patternTeaser';
import { DailyLog, UserProfile, AIInsight } from '../../types';

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
  ): Promise<string | AIInsight | null> {
    const briefCacheKey = `sia_brief_${userId}_${targetDate}`;
    const cached = sessionStorage.getItem(briefCacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return cached;
      }
    }

    const globalCached = await getCachedDailyBrief(userId, targetDate);
    if (globalCached) {
      if (typeof globalCached !== 'string') {
        sessionStorage.setItem(briefCacheKey, JSON.stringify(globalCached));
        return globalCached;
      }
      sessionStorage.setItem(briefCacheKey, globalCached);
      return globalCached;
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

    if (freshBrief && typeof freshBrief !== 'string') {
      sessionStorage.setItem(briefCacheKey, JSON.stringify(freshBrief));
      return freshBrief;
    }

    if (freshBrief && typeof freshBrief === 'string' && !freshBrief.toLowerCase().includes("no brief available")) {
      sessionStorage.setItem(briefCacheKey, freshBrief);
      return freshBrief;
    }

    return null;
  }

  static async syncPatternInsight(
    userId: string,
    targetDate: string,
    logs: DailyLog[],
    userProfile: UserProfile,
    maturityLevel: number
  ): Promise<AIInsight | string | null> {
    const insightCacheKey = `sia_insight_${userId}_${targetDate}`;
    const cached = sessionStorage.getItem(insightCacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return cached;
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const logsInLastMonthCount = logs.filter(log => new Date(log.date) >= thirtyDaysAgo).length;

    const tier = userProfile.tier || 'Basic';
    const generatedTeaser = await generatePatternTeaser(logs, tier as any, logsInLastMonthCount, maturityLevel);

    if (generatedTeaser && typeof generatedTeaser !== 'string') {
      sessionStorage.setItem(insightCacheKey, JSON.stringify(generatedTeaser));
      return generatedTeaser;
    } else if (typeof generatedTeaser === 'string' && !generatedTeaser.includes("Unable to generate") && !generatedTeaser.includes("Pattern unavailable")) {
      sessionStorage.setItem(insightCacheKey, generatedTeaser);
      return generatedTeaser;
    }

    return null;
  }
}
