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

const DISCLAIMER = "SIA provides lifestyle recommendations based on patterns. This is not a medical diagnosis. Consult a professional for clinical concerns.";

export interface MaturityInfo {
  level: 1 | 2 | 3;
  count: number;
  label: string;
  nextThreshold: number;
}

export class AIService {
  private static apiKey = process.env.GEMINI_API_KEY || "";

  static getModelForTier(tier: UserTier): string {
    switch (tier) {
      case 'Pro':
        return "gemini-3.1-pro-preview";
      case 'Enhanced':
      case 'Basic':
      default:
        return "gemini-3-flash-preview";
    }
  }

  static async getUserDataMaturity(userId: string): Promise<MaturityInfo> {
    const logsRef = collection(db!, 'users', userId, 'sleep_logs');
    const snapshot = await getDocs(query(logsRef, where('type', '==', 'log')));
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

  static async generateDailyBrief(userId: string, logs: DailyLog[], tier: UserTier): Promise<string> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const cached = await this.getCachedDailyBrief(userId, today);
    
    if (cached) return cached.content;

    const modelName = this.getModelForTier(tier);
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    const prompt = `
      Analyze the following sleep logs and provide a concise daily brief (max 3 sentences).
      Logs: ${JSON.stringify(logs.slice(0, 7))}
      Focus on immediate recovery status and one actionable tip for tonight.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are SIA, a Sleep Intelligence Agent. Provide a brief, professional daily summary.",
        temperature: 0.7
      }
    });

    const content = response.text || "Unable to generate brief.";
    const finalContent = `${content}\n\n***\n\n${DISCLAIMER}`;

    // Cache it
    await addDoc(collection(db!, 'users', userId, 'daily_briefs'), {
      date: today,
      content: finalContent,
      createdAt: serverTimestamp()
    });

    return finalContent;
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

    // 3. Get Cached Brief for context
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
      - Clinical Brief: ${context.clinicalBrief}
      
      INSTRUCTIONS:
      1. Use the provided data to find correlations, patterns, and triggers.
      2. Deliver insights in a conversational, supportive, and professional tone.
      3. Use Markdown formatting.
      4. If you identify a significant new Pattern, Risk, or Recommendation, include it in the 'newInsights' array.
      
      RESPONSE FORMAT:
      You must return a JSON object:
      {
        "answer": "Your response in Markdown",
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

    try {
      const response = await ai.models.generateContent({
        model: modelName,
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
            required: ["answer"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      const answer = result.answer || "I'm sorry, I couldn't process that.";
      const finalAnswer = `${answer}\n\n***\n\n${DISCLAIMER}`;

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
