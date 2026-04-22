import { siaClient } from './SiaClient';
import { DailyLog, UserTier } from '../../types';
import { calculateLogVitality } from '../../utils/correctionLogic';

const DISCLAIMER = "SIA provides lifestyle recommendations based on patterns. This is not a medical diagnosis. Consult a professional for clinical concerns.";

import { db, doc, getDoc } from '../../lib/firebase';

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
    const prompt = `
      Today's date is ${currentDate}.
      SIA is analyzing the log for last night: ${lastNightDate}.
      Provide a briefing based specifically on the log dated ${lastNightDate}.
      Analyze the following sleep logs: ${JSON.stringify(logs.slice(0, 7))}
      Calculate the delta between the log from ${lastNightDate} and the 7-day average.
      Provide a concise morning briefing (max 3 sentences).
      ${tier === 'Enhanced' ? 'Include a recommendation for "Circadian Advice" (e.g., optimized light exposure at a specific time).' : ''}
    `;

    const response = await siaClient.generateContent(prompt, {
        systemInstruction: "You are SIA, a Sleep Intelligence Agent. Provide a brief, professional daily summary.",
        temperature: 0.7
    });

    const content = response.text || "Unable to generate brief.";
    
    // Check for partial logs
    const hasPartialLogs = logs.some(log => calculateLogVitality(log) < 100);
    const partialTag = hasPartialLogs ? "\n\n*Analysis based on Partial Data*" : "";
    
    return `${content}${partialTag}\n\n***\n\n${DISCLAIMER}`;
};
