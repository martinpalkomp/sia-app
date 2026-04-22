import { siaClient } from './SiaClient';
import { UserTier } from '../../types';
import { MaturityInfo } from '../aiService';
import { shouldTriggerAI } from '../../utils/aiGuardrails';
import { Type } from '@google/genai';
import { AIService } from '../aiService'; // For quota check during transitional refactor
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const DISCLAIMER = "SIA provides lifestyle recommendations based on patterns. This is not a medical diagnosis. Consult a professional for clinical concerns.";

export const chatWithSIA = async (
    userId: string, 
    userMessage: string, 
    tier: UserTier, 
    context: {
      clinicalBrief: string;
      personalizationProfile: any;
      history: any[];
      logsCount: number;
      logsInLastMonthCount: number;
    },
    maturity: MaturityInfo,
    dailyBriefContent: string | null
): Promise<{ answer: string; newInsights?: any[]; error?: string; limitReached?: boolean }> => {
    
    // 1. Check Quota
    const quota = await AIService.checkAndResetQuota(userId, tier);
    const limit = AIService.getQuotaLimit(tier);
    
    if (quota.chatMessagesUsed >= limit) {
      return { answer: "", limitReached: true };
    }

    // 3. Check ClinicalInsights Guardrail
    const clinicalGuardrail = shouldTriggerAI(tier, maturity.level, context.logsCount, context.logsInLastMonthCount, 'ClinicalInsights', null);

    const systemInstruction = `
      You are SIA, a clinical sleep scientist. 
      
      GUARDRAIL: Strictly stick to sleep science, recovery, and circadian health. If the user asks about unrelated topics, politely redirect them back to sleep analysis.
      
      DATA MATURITY: You are at Level ${maturity.level} (${maturity.label}).
      ${maturity.level === 1 ? "Only provide basic daily correlations. Avoid long-term trend analysis." : ""}
      ${maturity.level === 2 ? "You can analyze weekly patterns and trends." : ""}
      ${maturity.level === 3 ? "You have full clinical insight capabilities." : ""}

      DAILY BRIEF CONTEXT:
      ${dailyBriefContent ? dailyBriefContent : "No daily brief available yet."}

      USER CONTEXT:
      - Personalization: ${JSON.stringify(context.personalizationProfile)}
      ${(() => {
          const conditions = context.personalizationProfile?.demographics?.healthConditions;
          if (!conditions || conditions.length === 0) return '';
        
          const conditionGuidance: Record<string, string> = {
            'Insomnia': 'INSOMNIA: Expect prolonged sleep onset and fragmented architecture. Cross-reference screensInBed (screens worsen onset), stressLevel (stress drives rumination), and bedtime consistency. Flag any nights where bedtime drifted >30 min from average — inconsistency perpetuates insomnia. Reinforce natural wake as a positive signal.',
            'Obstructive Sleep Apnea (OSA)': 'OSA: Expect fragmented sleep with frequent AWAKE-IN events regardless of apparent sleep duration. Efficiency metric alone is misleading — short AWAKE-IN bursts indicate arousal events. Cross-reference alcohol consumption (alcohol worsens airway relaxation) and sleep position tools. Flag alcohol nights with low efficiency. Note if user uses CPAP or positional aids in sleepGadgets.',
            'Restless Legs Syndrome (RLS)': 'RLS: Expect difficulty at sleep onset (early AWAKE-IN events) and frequent mid-night arousals — symptoms worsen in the evening. Cross-reference exercise timing: moderate daytime exercise often reduces RLS symptoms; late exercise may worsen them. Caffeine and alcohol both aggravate RLS — flag high-intake nights with poor onset.',
            'Narcolepsy': 'NARCOLEPSY: Do not judge daytime energy scores against normal population norms — baseline is structurally lower. Focus on relative improvements and consistency rather than absolute values. Note any pattern between sleep quality and next-day alertness variability.',
            'Parasomnias': 'PARASOMNIAS (sleepwalking/night terrors): Expect disrupted sleep architecture with unusual AWAKE-IN patterns in the first half of the night. Cross-reference alcohol (strong trigger for parasomnias), stressLevel (stress increases frequency), and sleep deprivation — poor previous nights increase parasomnia risk.',
            'Arthritis': 'ARTHRITIS/JOINT PAIN: Pain worsens with inactivity and cold — expect more disruption in winter or after sedentary days. Cross-reference exercise type and timing (gentle movement improves pain-related sleep; intense late exercise may worsen it). Note if user uses weighted blanket or thermal devices in sleepGadgets.',
            'Fibromyalgia': 'FIBROMYALGIA: Pain and fatigue are bidirectionally linked — poor sleep worsens pain, pain worsens sleep. Do not interpret low R (restedness) and L (energy) scores as purely sleep failures; they reflect systemic fatigue. Cross-reference stressLevel (strong fibromyalgia trigger) and exercise (gentle movement helps, overexertion hurts). Consistency of sleep timing is especially important.',
            'Chronic back pain': 'CHRONIC BACK PAIN: Sleep position and surface matter — note sleepGadgets for any positioning or thermal aids. Cross-reference exercise: regular gentle movement reduces pain-disrupted nights. Flag nights after sedentary days or high-stress days where back pain likely peaked.',
            'Asthma': 'ASTHMA: Nocturnal asthma peaks between 02:00–04:00 — look for AWAKE-IN clusters in that window. Cross-reference environmentType (urban/noisy = higher pollution/allergen exposure). Alcohol and cold air are common triggers. Note if air quality tools appear in sleepGadgets.',
            'COPD': 'COPD: Expect reduced sleep efficiency and oxygen-related arousals. Sleep position affects breathing — head elevation helps. Flag alcohol nights (respiratory depressant). Morning alertness (R score) is a useful proxy for overnight breathing quality.',
            'Allergic rhinitis': 'ALLERGIC RHINITIS: Nasal congestion disrupts breathing and causes arousals. Cross-reference environmentType (urban/noisy = higher allergen load). Note seasonal patterns if date range covers multiple months. Gadgets like air purifiers or white noise machines may be relevant.',
            'Anxiety disorders': 'ANXIETY: Sleep onset is typically the primary disruption — racing thoughts delay sleep. Cross-reference screensInBed (strong anxiety amplifier), stressLevel, and lastMealTime (late eating raises cortisol). Look for Sunday-night pattern (anticipatory anxiety before workweek). Consistent bedtime routine is the highest-leverage intervention — flag consistency.',
            'Depression': 'DEPRESSION: Expect either hypersomnia (long duration, low energy despite long sleep) or insomnia patterns. Morning alertness (R) often disproportionately low. Cross-reference naturalWake — inability to wake naturally may signal hypersomnia. Exercise is a strong evidence-based intervention — flag weeks with vs. without exercise.',
            'PTSD': 'PTSD: Expect hyperarousal at sleep onset and nightmare-driven arousals in REM (latter half of night — AWAKE-IN events after 03:00). Cross-reference alcohol (common PTSD self-medication but worsens nightmares by suppressing REM). stressLevel is a strong predictor of bad nights. Note any relaxation tools in sleepGadgets.',
            'Bipolar disorder': 'BIPOLAR: Sleep disruption is both a symptom and a trigger. Reduced need for sleep often precedes manic episodes — flag nights where duration drops sharply with no apparent external cause but mood/energy is high. Conversely, hypersomnia may precede depressive episodes. Consistency of sleep timing is a clinical priority — flag all drift.',
            'Shift Work Sleep Disorder': "SHIFT WORK: Do NOT penalise circadian inconsistency metrics — the user's schedule makes consistency structurally impossible. Focus on sleep quality and efficiency within each sleep opportunity rather than timing regularity. Flag alcohol and caffeine usage relative to shift timing rather than clock time.",
            'Delayed Sleep Phase Syndrome': "DSPS: The user's natural sleep window is structurally late. Do not interpret late bedtimes as poor discipline. Focus on consistency within their phase (e.g. consistently 01:00–09:00 is healthy for DSPS). Morning light exposure and avoidance of bright light at night are high-leverage — cross-reference light therapy in sleepGadgets.",
            'Jet Lag (chronic)': 'CHRONIC JET LAG: Circadian disruption is externally imposed. Look for temporal clustering of poor sleep around travel periods if date data suggests it. Morning light therapy is evidence-based — note in sleepGadgets.',
            'GERD': 'GERD: Lying flat triggers reflux — expect arousals in the first 2–3 hours after sleep onset. lastMealTime is the single most important cross-reference: meals within 2–3 hours of bedtime strongly increase reflux events. Flag those nights explicitly. Alcohol is a direct GERD trigger. Head elevation may help — note in gadgets.',
            'Hyperthyroidism': 'HYPERTHYROIDISM: Elevated metabolic rate causes hyperarousal, heat sensitivity, and frequent waking. Expect high fragmentation and low efficiency. Cross-reference stressLevel (amplifies thyroid symptoms). Note environmental temperature tools in sleepGadgets.',
            'Diabetes': 'DIABETES: Nocturia (frequent urination) causes AWAKE-IN events — look for short repeated arousals. lastMealTime and meal composition affect overnight glucose — late meals may worsen nocturia. Cross-reference alcohol (alters glucose regulation). Morning energy (L score) reflects overnight glycaemic stability.'
          };
        
          const relevantGuidance = conditions
            .map((c: string) => conditionGuidance[c])
            .filter(Boolean)
            .join('\\n\\n      ');
        
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

    try {
      const contents = [
          ...context.history,
          { role: "user", parts: [{ text: userMessage }] }
      ];

      const response = await siaClient.generateContentRaw(contents, {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            // @ts-ignore
            type: Type.OBJECT,
            properties: {
              // @ts-ignore
              answer: { type: Type.STRING },
              // @ts-ignore
              sleep_quality: { type: Type.NUMBER },
              // @ts-ignore
              morning_alertness: { type: Type.NUMBER },
              // @ts-ignore
              daytime_energy: { type: Type.NUMBER },
              newInsights: {
                // @ts-ignore
                type: Type.ARRAY,
                items: {
                  // @ts-ignore
                  type: Type.OBJECT,
                  properties: {
                    // @ts-ignore
                    type: { type: Type.STRING, enum: ["Pattern", "Risk", "Recommendation"] },
                    // @ts-ignore
                    confidence: { type: Type.NUMBER },
                    // @ts-ignore
                    summary: { type: Type.STRING },
                    // @ts-ignore
                    details: { type: Type.STRING },
                    // @ts-ignore
                    linkedDates: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["type", "confidence", "summary", "linkedDates"]
                }
              }
            },
            required: ["answer", "sleep_quality", "morning_alertness", "daytime_energy"]
          }
      });

      const result = JSON.parse(response.text || '{}');
      const answer = result.answer || "I'm sorry, I couldn't process that.";
      const finalAnswer = `${answer}\n\n***\n\n${DISCLAIMER}`;

      if (!clinicalGuardrail.shouldTrigger) {
        delete result.newInsights;
      }

      // Increment quota
      if (db) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            'quota.chatMessagesUsed': quota.chatMessagesUsed + 1
        });
      }

      return { answer: finalAnswer, newInsights: result.newInsights };
    } catch (error) {
      console.error("Chat Error:", error);
      return { answer: "An error occurred.", error: String(error) };
    }
};
