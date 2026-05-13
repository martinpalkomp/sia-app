import { aiClient as siaClient } from './core/aiClient';
import { DailyLog, UserTier } from '../../types';
import { calculateLogVitality } from '../../utils/correctionLogic';
import { shouldTriggerAI } from './core/guardrails';

import { SIA_DISCLAIMER, SIA_BRIEF_PERSONA } from './aiConstants';

import { db, doc, getDoc, setDoc, serverTimestamp } from '../../lib/firebase';

export const getCachedDailyBrief = async (userId: string, date: string): Promise<string | null> => {
  if (!db) return null;
  try {
    const docSnap = await getDoc(doc(db, 'users', userId, 'daily_briefs', date));
    if (docSnap.exists()) {
      return docSnap.data().content;
    }
  } catch (error) {
    console.error("Failed to fetch cached brief:", error);
  }
  return null;
};

export const generateDailyBrief = async (
  userId: string, 
  logs: DailyLog[], 
  tier: UserTier, 
  currentDate: string, 
  lastNightDate: string
): Promise<string> => {
    const guardrail = shouldTriggerAI(tier, null, logs.length, 0, 'DailyBrief', null);
    if (!guardrail.shouldTrigger) {
      // Returning this specific phrase will cause DashboardContainer to setDailyBrief(null)
      // because we'll modify DashboardContainer to check for this or we return "No brief available"
      return "No brief available. " + (guardrail.reason || "");
    }

    // THE "NIGHT BEFORE" RULE
    const lastNightLog = logs.find(log => log.date === lastNightDate);
    
    if (!lastNightLog) {
      return "SIA morning brief requires last night's data. Please log your sleep for the night before to unlock today's briefing.";
    }

    const prompt = `
      Today's date is ${currentDate}.
      SIA is analyzing the log for last night: ${lastNightDate}.
      Provide a briefing based specifically on the log dated ${lastNightDate}.
      Calculate the delta between the log from ${lastNightDate} and the 6-day average.

      Return a JSON object in EXACTLY this format:
      {
        "briefing": ["sentence 1", "sentence 2", "max sentence 3"],
        "recommendation": "Lifestyle/Behavioral Protocol (if Enhanced/Pro) or empty string"
      }

      ${tier === 'Enhanced' || tier === 'Pro' ? 'Include a single, highly actionable, hyper-personalized "Lifestyle & Behavioral Protocol" recommendation based specifically on the latest log\'s data (e.g., precise wind-down timing, specific environmental adjustment, or cognitive stress-reduction technique) in the recommendation field.' : ''}
    `;

    const lightweightLogs = logs.slice(0, 6).map(log => {
      const { visualTimeline, sleepEvents, ...rest } = log;
      return rest;
    });

    const response = await siaClient.generateContentRaw([
      { role: "user", parts: [{ text: `Recent Logs: ${JSON.stringify(lightweightLogs)}` }] },
      { role: "user", parts: [{ text: prompt }] }
    ], {
        systemInstruction: SIA_BRIEF_PERSONA,
        temperature: 0.7,
        responseMimeType: "application/json"
    });

    const contentText = response.text || "{}";
    let parsed;
    try {
        parsed = JSON.parse(contentText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim());
    } catch {
        parsed = { briefing: ["Unable to generate brief."] };
    }
    
    let content = (parsed.briefing || []).join(" ");
    if (parsed.recommendation) {
        content += "\n\n" + parsed.recommendation;
    }
    
    // Check for partial logs
    const hasPartialLogs = logs.some(log => calculateLogVitality(log) < 100);
    const partialTag = hasPartialLogs ? "\n\n*Analysis based on Partial Data*" : "";
    
    const finalContent = `${content}${partialTag}\n\n***\n\n${SIA_DISCLAIMER}`;
    if (db) {
      try {
        await setDoc(
          doc(db, 'users', userId, 'daily_briefs', currentDate),
          { content: finalContent, generatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch (e) {
        console.warn('[SIA] Failed to persist daily brief to Firestore:', e);
      }
    }
    
    return finalContent;
};
