import { GoogleGenAI, Type } from "@google/genai";
import { 
  db, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  updateDoc,
  setDoc
} from "../lib/firebase";
import { DailyLog, UserTier, UserQuota, DailyBrief, UserProfile } from "../types";
import { format, startOfDay } from "date-fns";
import { shouldTriggerAI } from "../utils/aiGuardrails";
import { calculateLogVitality } from "../utils/correctionLogic";

const DISCLAIMER = "SIA provides lifestyle recommendations based on patterns. This is not a medical diagnosis. Consult a professional for clinical concerns.";

export interface MaturityInfo {
  level: 1 | 2 | 3;
  count: number;
  label: string;
  nextThreshold: number;
}

export interface AIResponse {
  content: string | null;
  status: 'success' | 'skipped';
  reason?: string;
}

export class AIService {
  private static apiKey = process.env.GEMINI_API_KEY || "";

  static getModelForTier(tier: UserTier): string { return "gemini-3-flash-preview"; }

  static async getUserDataMaturity(userId: string): Promise<MaturityInfo> {
    const userSnap = await getDoc(doc(db!, 'users', userId));
    const userData = userSnap.data();
    if (userData?.levelOverride) {
      const level = userData.levelOverride;
      if (level === 3) return { level: 3, count: 90, label: 'Full Insight', nextThreshold: 90 };
      if (level === 2) return { level: 2, count: 15, label: 'Emerging Patterns', nextThreshold: 90 };
      return { level: 1, count: 0, label: 'Baseline', nextThreshold: 15 };
    }

    const logsRef = collection(db!, 'users', userId, 'sleep_logs');
    const snapshot = await getDocs(query(logsRef));
    const count = snapshot.size;

    if (count >= 90) return { level: 3, count, label: 'Full Insight', nextThreshold: 90 };
    if (count >= 15) return { level: 2, count, label: 'Emerging Patterns', nextThreshold: 90 };
    return { level: 1, count, label: 'Baseline', nextThreshold: 15 };
  }

  static async checkAndResetQuota(userId: string, tier: UserTier): Promise<UserQuota> {
    const userRef = doc(db!, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    let quota: UserQuota = {
      chatMessagesUsed: 0,
      lastPromptReset: serverTimestamp()
    };

    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.quota) {
        quota = data.quota;
        
        const lastReset = quota.lastPromptReset?.toDate?.() || new Date(0);
        const now = new Date();
        
        // Reset if it's a new day
        if (startOfDay(lastReset).getTime() < startOfDay(now).getTime()) {
          quota.chatMessagesUsed = 0;
          quota.lastPromptReset = serverTimestamp();
          await updateDoc(userRef, { quota });
        }
      } else {
        await updateDoc(userRef, { quota });
      }
    } else {
      // Create user doc if it doesn't exist (though it should)
      await setDoc(userRef, { 
        uid: userId, 
        tier: 'Basic', 
        quota,
        createdAt: serverTimestamp() 
      }, { merge: true });
    }

    return quota;
  }

  static getQuotaLimit(tier: UserTier): number {
    switch (tier) {
      case 'Pro': return Infinity;
      case 'Enhanced': return 10;
      case 'Basic': return 3;
      default: return 3;
    }
  }

  static async getCachedDailyBrief(userId: string, date: string): Promise<DailyBrief | null> {
    const briefRef = collection(db!, 'users', userId, 'daily_briefs');
    const q = query(briefRef, where('date', '==', date), limit(1));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as DailyBrief;
    }
    return null;
  }

  static async generateDailyBrief(userId: string, logs: DailyLog[], tier: UserTier, maturity: MaturityInfo): Promise<AIResponse> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const cached = await this.getCachedDailyBrief(userId, today);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const logsInLastMonthCount = logs.filter(log => new Date(log.date) >= oneMonthAgo).length;

    const guardrail = shouldTriggerAI(tier, maturity.level, logs.length, logsInLastMonthCount, 'DailyBrief', cached ? today : null);
    if (!guardrail.shouldTrigger) {
      if (cached && guardrail.reason === "Already generated today.") {
        return { content: cached.content, status: 'success' };
      }
      return { content: null, status: 'skipped', reason: guardrail.reason };
    }

    const modelName = this.getModelForTier(tier);
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const prompt = `
      Analyze the following sleep logs and provide a concise daily brief (max 3 sentences).
      Logs: ${JSON.stringify(logs.slice(0, 7))}
      Focus on immediate recovery status and one actionable tip for tonight.
    `;

    const callModel = async (model: string) => {
      return await ai.models.generateContent({
        model: model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "You are SIA, a Sleep Intelligence Agent. Provide a brief, professional daily summary.",
          temperature: 0.7
        }
      });
    };

    try {
      let response;
      try {
        response = await callModel(modelName);
      } catch (error: any) {
        if (error.status === 404) {
          console.warn(`Model ${modelName} not found, falling back to gemini-3-flash-preview`);
          response = await callModel("gemini-3-flash-preview");
        } else {
          throw error;
        }
      }
      const content = response.text || "Unable to generate brief.";
      
      // Check for partial logs
      const hasPartialLogs = logs.some(log => calculateLogVitality(log) < 100);
      const partialTag = hasPartialLogs ? "\n\n*Analysis based on Partial Data*" : "";
      
      const finalContent = `${content}${partialTag}\n\n***\n\n${DISCLAIMER}`;

      // Cache it
      await addDoc(collection(db!, 'users', userId, 'daily_briefs'), {
        date: today,
        content: finalContent,
        createdAt: serverTimestamp()
      });

      return { content: finalContent, status: 'success' };
    } catch (error: any) {
      if (error.status === 503) {
        return { content: "SIA is currently busy. Please try applying the pattern again in a few seconds.", status: 'success' };
      }
      throw error;
    }
  }

  static async generateDeepAnalysis(userId: string, logs: DailyLog[], tier: UserTier, maturity: MaturityInfo, lastGeneratedDate: string | null): Promise<AIResponse> {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const logsInLastMonthCount = logs.filter(log => new Date(log.date) >= oneMonthAgo).length;

    const guardrail = shouldTriggerAI(tier, maturity.level, logs.length, logsInLastMonthCount, 'DeepAnalysis', lastGeneratedDate);
    if (!guardrail.shouldTrigger) {
      return { content: null, status: 'skipped', reason: guardrail.reason };
    }

    const modelName = this.getModelForTier(tier);
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const prompt = `
      Analyze ${logs.length} days of sleep history: ${JSON.stringify(logs.slice(0, 90))}
      Provide a structured "SIA Monthly Analysis" (max 3 sentences).
      Identify the single most significant trend and offer a specific, actionable clinical recommendation.
      Format: "📊 SIA Monthly Analysis: [Your analysis here]"
    `;

    const callModel = async (model: string) => {
      return await ai.models.generateContent({
        model: model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "You are 'SIA', a Sleep Intelligence Agent. Provide deep, structured, data-backed long-term sleep analysis.",
          temperature: 0.7
        }
      });
    };

    try {
      let response;
      try {
        response = await callModel(modelName);
      } catch (error: any) {
        if (error.status === 404) {
          console.warn(`Model ${modelName} not found, falling back to gemini-3-flash-preview`);
          response = await callModel("gemini-3-flash-preview");
        } else {
          throw error;
        }
      }

      const content = response.text || "Unable to generate analysis.";
      const finalContent = `${content}\n\n***\n\n${DISCLAIMER}`;

      return { content: finalContent, status: 'success' };
    } catch (error: any) {
      if (error.status === 503) {
        return { content: "SIA is currently busy. Please try applying the pattern again in a few seconds.", status: 'success' };
      }
      throw error;
    }
  }

  static async generateQuickInsight(userId: string, logs: DailyLog[], tier: UserTier, maturity: MaturityInfo, lastGeneratedDate: string | null): Promise<AIResponse> {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const logsInLastMonthCount = logs.filter(log => new Date(log.date) >= oneMonthAgo).length;

    const guardrail = shouldTriggerAI(tier, maturity.level, logs.length, logsInLastMonthCount, 'QuickInsight', lastGeneratedDate);
    if (!guardrail.shouldTrigger) {
      return { content: null, status: 'skipped', reason: guardrail.reason };
    }

    const modelName = this.getModelForTier(tier);
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const prompt = `
      Analyze recent sleep logs: ${JSON.stringify(logs.slice(0, 14))}
      Provide a concise, actionable insight (max 2 sentences).
    `;

    const callModel = async (model: string) => {
      return await ai.models.generateContent({
        model: model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "You are SIA, a Sleep Intelligence Agent. Provide a quick, actionable insight.",
          temperature: 0.7
        }
      });
    };

    try {
      let response;
      try {
        response = await callModel(modelName);
      } catch (error: any) {
        if (error.status === 404) {
          console.warn(`Model ${modelName} not found, falling back to gemini-3-flash-preview`);
          response = await callModel("gemini-3-flash-preview");
        } else {
          throw error;
        }
      }

      const content = response.text || "Unable to generate insight.";
      const finalContent = `${content}\n\n***\n\n${DISCLAIMER}`;

      return { content: finalContent, status: 'success' };
    } catch (error: any) {
      if (error.status === 503) {
        return { content: "SIA is currently busy. Please try applying the pattern again in a few seconds.", status: 'success' };
      }
      throw error;
    }
  }

  static async chatWithSIA(
    userId: string, 
    userMessage: string, 
    tier: UserTier, 
    context: {
      clinicalBrief: string;
      personalizationProfile: any;
      history: any[];
    }
  ): Promise<{ answer: string; newInsights?: any[]; error?: string; limitReached?: boolean }> {
    
    // 1. Check Quota
    const quota = await this.checkAndResetQuota(userId, tier);
    const limit = this.getQuotaLimit(tier);
    
    if (quota.chatMessagesUsed >= limit) {
      return { answer: "", limitReached: true };
    }

    // 2. Check Maturity
    const maturity = await this.getUserDataMaturity(userId);

    // 3. Check ClinicalInsights Guardrail
    const logsRef = collection(db!, 'users', userId, 'sleep_logs');
    const logsSnap = await getDocs(query(logsRef));
    const logs: DailyLog[] = [];
    logsSnap.forEach(doc => logs.push(doc.data() as DailyLog));
    const logsCount = logs.length;
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const logsInLastMonthCount = logs.filter(log => new Date(log.date) >= oneMonthAgo).length;

    const clinicalGuardrail = shouldTriggerAI(tier, maturity.level, logsCount, logsInLastMonthCount, 'ClinicalInsights', null);

    // 4. Get Cached Brief for context
    const today = format(new Date(), 'yyyy-MM-dd');
    const cachedBrief = await this.getCachedDailyBrief(userId, today);

    const modelName = this.getModelForTier(tier);
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const systemInstruction = `
      You are SIA, a clinical sleep scientist. 
      
      GUARDRAIL: Strictly stick to sleep science, recovery, and circadian health. If the user asks about unrelated topics, politely redirect them back to sleep analysis.
      
      DATA MATURITY: You are at Level ${maturity.level} (${maturity.label}).
      ${maturity.level === 1 ? "Only provide basic daily correlations. Avoid long-term trend analysis." : ""}
      ${maturity.level === 2 ? "You can analyze weekly patterns and trends." : ""}
      ${maturity.level === 3 ? "You have full clinical insight capabilities." : ""}

      DAILY BRIEF CONTEXT:
      ${cachedBrief ? cachedBrief.content : "No daily brief available yet."}

      USER CONTEXT:
      - Personalization: ${JSON.stringify(context.personalizationProfile)}
      ${(() => {
  const conditions = context.personalizationProfile?.demographics?.healthConditions;
  if (!conditions || conditions.length === 0) return '';

  const conditionGuidance: Record<string, string> = {
    'Insomnia':
      'INSOMNIA: Expect prolonged sleep onset and fragmented architecture. Cross-reference screensInBed (screens worsen onset), stressLevel (stress drives rumination), and bedtime consistency. Flag any nights where bedtime drifted >30 min from average — inconsistency perpetuates insomnia. Reinforce natural wake as a positive signal.',

    'Obstructive Sleep Apnea (OSA)':
      'OSA: Expect fragmented sleep with frequent AWAKE-IN events regardless of apparent sleep duration. Efficiency metric alone is misleading — short AWAKE-IN bursts indicate arousal events. Cross-reference alcohol consumption (alcohol worsens airway relaxation) and sleep position tools. Flag alcohol nights with low efficiency. Note if user uses CPAP or positional aids in sleepGadgets.',

    'Restless Legs Syndrome (RLS)':
      'RLS: Expect difficulty at sleep onset (early AWAKE-IN events) and frequent mid-night arousals — symptoms worsen in the evening. Cross-reference exercise timing: moderate daytime exercise often reduces RLS symptoms; late exercise may worsen them. Caffeine and alcohol both aggravate RLS — flag high-intake nights with poor onset.',

    'Narcolepsy':
      'NARCOLEPSY: Do not judge daytime energy scores against normal population norms — baseline is structurally lower. Focus on relative improvements and consistency rather than absolute values. Note any pattern between sleep quality and next-day alertness variability.',

    'Parasomnias':
      'PARASOMNIAS (sleepwalking/night terrors): Expect disrupted sleep architecture with unusual AWAKE-IN patterns in the first half of the night. Cross-reference alcohol (strong trigger for parasomnias), stressLevel (stress increases frequency), and sleep deprivation — poor previous nights increase parasomnia risk.',

    'Arthritis':
      'ARTHRITIS/JOINT PAIN: Pain worsens with inactivity and cold — expect more disruption in winter or after sedentary days. Cross-reference exercise type and timing (gentle movement improves pain-related sleep; intense late exercise may worsen it). Note if user uses weighted blanket or thermal devices in sleepGadgets.',

    'Fibromyalgia':
      'FIBROMYALGIA: Pain and fatigue are bidirectionally linked — poor sleep worsens pain, pain worsens sleep. Do not interpret low R (restedness) and L (energy) scores as purely sleep failures; they reflect systemic fatigue. Cross-reference stressLevel (strong fibromyalgia trigger) and exercise (gentle movement helps, overexertion hurts). Consistency of sleep timing is especially important.',

    'Chronic back pain':
      'CHRONIC BACK PAIN: Sleep position and surface matter — note sleepGadgets for any positioning or thermal aids. Cross-reference exercise: regular gentle movement reduces pain-disrupted nights. Flag nights after sedentary days or high-stress days where back pain likely peaked.',

    'Asthma':
      'ASTHMA: Nocturnal asthma peaks between 02:00–04:00 — look for AWAKE-IN clusters in that window. Cross-reference environmentType (urban/noisy = higher pollution/allergen exposure). Alcohol and cold air are common triggers. Note if air quality tools appear in sleepGadgets.',

    'COPD':
      'COPD: Expect reduced sleep efficiency and oxygen-related arousals. Sleep position affects breathing — head elevation helps. Flag alcohol nights (respiratory depressant). Morning alertness (R score) is a useful proxy for overnight breathing quality.',

    'Allergic rhinitis':
      'ALLERGIC RHINITIS: Nasal congestion disrupts breathing and causes arousals. Cross-reference environmentType (urban/noisy = higher allergen load). Note seasonal patterns if date range covers multiple months. Gadgets like air purifiers or white noise machines may be relevant.',

    'Anxiety disorders':
      'ANXIETY: Sleep onset is typically the primary disruption — racing thoughts delay sleep. Cross-reference screensInBed (strong anxiety amplifier), stressLevel, and lastMealTime (late eating raises cortisol). Look for Sunday-night pattern (anticipatory anxiety before workweek). Consistent bedtime routine is the highest-leverage intervention — flag consistency.',

    'Depression':
      'DEPRESSION: Expect either hypersomnia (long duration, low energy despite long sleep) or insomnia patterns. Morning alertness (R) often disproportionately low. Cross-reference naturalWake — inability to wake naturally may signal hypersomnia. Exercise is a strong evidence-based intervention — flag weeks with vs. without exercise.',

    'PTSD':
      'PTSD: Expect hyperarousal at sleep onset and nightmare-driven arousals in REM (latter half of night — AWAKE-IN events after 03:00). Cross-reference alcohol (common PTSD self-medication but worsens nightmares by suppressing REM). stressLevel is a strong predictor of bad nights. Note any relaxation tools in sleepGadgets.',

    'Bipolar disorder':
      'BIPOLAR: Sleep disruption is both a symptom and a trigger. Reduced need for sleep often precedes manic episodes — flag nights where duration drops sharply with no apparent external cause but mood/energy is high. Conversely, hypersomnia may precede depressive episodes. Consistency of sleep timing is a clinical priority — flag all drift.',

    'Shift Work Sleep Disorder':
      'SHIFT WORK: Do NOT penalise circadian inconsistency metrics — the user\'s schedule makes consistency structurally impossible. Focus on sleep quality and efficiency within each sleep opportunity rather than timing regularity. Flag alcohol and caffeine usage relative to shift timing rather than clock time.',

    'Delayed Sleep Phase Syndrome':
      'DSPS: The user\'s natural sleep window is structurally late. Do not interpret late bedtimes as poor discipline. Focus on consistency within their phase (e.g. consistently 01:00–09:00 is healthy for DSPS). Morning light exposure and avoidance of bright light at night are high-leverage — cross-reference light therapy in sleepGadgets.',

    'Jet Lag (chronic)':
      'CHRONIC JET LAG: Circadian disruption is externally imposed. Look for temporal clustering of poor sleep around travel periods if date data suggests it. Morning light therapy is evidence-based — note in sleepGadgets.',

    'GERD':
      'GERD: Lying flat triggers reflux — expect arousals in the first 2–3 hours after sleep onset. lastMealTime is the single most important cross-reference: meals within 2–3 hours of bedtime strongly increase reflux events. Flag those nights explicitly. Alcohol is a direct GERD trigger. Head elevation may help — note in gadgets.',

    'Hyperthyroidism':
      'HYPERTHYROIDISM: Elevated metabolic rate causes hyperarousal, heat sensitivity, and frequent waking. Expect high fragmentation and low efficiency. Cross-reference stressLevel (amplifies thyroid symptoms). Note environmental temperature tools in sleepGadgets.',

    'Diabetes':
      'DIABETES: Nocturia (frequent urination) causes AWAKE-IN events — look for short repeated arousals. lastMealTime and meal composition affect overnight glucose — late meals may worsen nocturia. Cross-reference alcohol (alters glucose regulation). Morning energy (L score) reflects overnight glycaemic stability.'
  };

  const relevantGuidance = conditions
    .map(c => conditionGuidance[c])
    .filter(Boolean)
    .join('\n\n      ');

  return relevantGuidance
    ? `\n\n      HEALTH CONDITIONS & INTERPRETATION RULES:\n      The user has self-reported the following conditions. Apply these interpretation adjustments throughout your entire analysis. Cross-reference against their actual logged data where indicated.\n\n      ${relevantGuidance}\n\n      GENERAL PRINCIPLE: Where a condition is present, always look for the condition-specific factor correlations in the logged data before drawing conclusions. Distinguish between sleep disruption caused by the condition vs. disruption caused by modifiable behaviours.`
    : '';
})()}
      - Clinical Brief: ${context.clinicalBrief}
      
      INSTRUCTIONS:
      1. Use the provided data to find correlations, patterns, and triggers.
      2. Deliver insights in a conversational, supportive, and professional tone.
      3. Use Markdown formatting.
      4. If you identify a significant new Pattern, Risk, or Recommendation, include it in the 'newInsights' array.
      5. You MUST provide predicted metrics for every routine suggestion: sleep_quality (1-10), morning_alertness (1-10), and daytime_energy (1-10). Do not leave them null or zero.
      
      RESPONSE FORMAT:
      You must return a JSON object:
      {
        "answer": "Your response in Markdown",
        "sleep_quality": 5,
        "morning_alertness": 5,
        "daytime_energy": 5,
        "newInsights": [
          {
            "type": "Pattern" | "Risk" | "Recommendation",
            "confidence": 0.0 to 1.0,
            "summary": "Short 1-sentence takeaway",
            "details": "Optional longer explanation",
            "linkedDates": ["YYYY-MM-DD", ...]
          }
        ]
      }
    `;

    const callModel = async (model: string) => {
      return await ai.models.generateContent({
        model: model,
        contents: [
          ...context.history,
          { role: "user", parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING },
              sleep_quality: { type: Type.NUMBER },
              morning_alertness: { type: Type.NUMBER },
              daytime_energy: { type: Type.NUMBER },
              newInsights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ["Pattern", "Risk", "Recommendation"] },
                    confidence: { type: Type.NUMBER },
                    summary: { type: Type.STRING },
                    details: { type: Type.STRING },
                    linkedDates: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["type", "confidence", "summary", "linkedDates"]
                }
              }
            },
            required: ["answer", "sleep_quality", "morning_alertness", "daytime_energy"]
          }
        }
      });
    };

    try {
      let response;
      try {
        response = await callModel(modelName);
      } catch (error: any) {
        if (error.status === 404) {
          console.warn(`Model ${modelName} not found, falling back to gemini-3-flash-preview`);
          response = await callModel("gemini-3-flash-preview");
        } else {
          throw error;
        }
      }

      const result = JSON.parse(response.text || '{}');
      const answer = result.answer || "I'm sorry, I couldn't process that.";
      const finalAnswer = `${answer}\n\n***\n\n${DISCLAIMER}`;

      if (!clinicalGuardrail.shouldTrigger) {
        delete result.newInsights;
      }

      // Increment quota
      const userRef = doc(db!, 'users', userId);
      await updateDoc(userRef, {
        'quota.chatMessagesUsed': quota.chatMessagesUsed + 1
      });

      return { answer: finalAnswer, newInsights: result.newInsights };
    } catch (error) {
      console.error("Chat Error:", error);
      return { answer: "An error occurred.", error: String(error) };
    }
  }
}

