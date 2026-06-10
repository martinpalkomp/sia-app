import { aiClient as siaClient } from "./core/aiClient";
import { DailyLog, UserTier, AIInsight } from "../../types";
import { calculateLogVitality } from "../../utils/correctionLogic";
import { shouldTriggerAI } from "./core/guardrails";
import { SIA_KNOWLEDGE_BASE } from "./core/knowledgeBase";
import { getLightweightLogsForAI } from "../../utils/sleepUtils";

import { SIA_DISCLAIMER, SIA_BRIEF_PERSONA } from "./aiConstants";

import { db, doc, getDoc, setDoc, serverTimestamp } from "../../lib/firebase";

export const getCachedDailyBrief = async (
  userId: string,
  date: string,
): Promise<string | AIInsight | null> => {
  if (!db) return null;
  try {
    const docSnap = await getDoc(
      doc(db, "users", userId, "daily_briefs", date),
    );
    if (docSnap.exists()) {
      return docSnap.data().insight || docSnap.data().content; // insight is the new structured format
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
  lastNightDate: string,
  maturityLevel: number,
): Promise<string | AIInsight> => {
  const guardrail = shouldTriggerAI(
    tier,
    maturityLevel,
    logs.length,
    0,
    "DailyBrief",
    null,
  );
  if (!guardrail.shouldTrigger) {
    return "No brief available. " + (guardrail.reason || "");
  }

  const lastNightLog = logs.find((log) => log.date === lastNightDate);

  if (!lastNightLog) {
    return "SIA morning brief requires last night's data. Please log your sleep for the night before to unlock today's briefing.";
  }

  const systemPrompt = `${SIA_BRIEF_PERSONA}\n\n${SIA_KNOWLEDGE_BASE}`;

  const prompt = `
      Today's date is ${currentDate}.
      SIA is analyzing the log for last night: ${lastNightDate}. (Immediate Layer).
      Provide a highly precise briefing based specifically on the log dated ${lastNightDate}.
      Calculate the delta between the log from ${lastNightDate} and the 6-day average.

      Follow the SIA_KNOWLEDGE_BASE strictly. No vague language. 

      Return a JSON object in EXACTLY this format, which matches our AIInsight schema:
      {
        "type": "daily_brief",
        "category": "sleep_quality",
        "confidence": "high",
        "evidence": ["e.g. your efficiency dropped 5%"],
        "recommendation": "${tier !== "Basic" ? "Actionable protocol goes here" : ""}",
        "timeframe": "immediate",
        "severity": "info",
        "summary": "1 sentence brief summary here. Plus 1 short sentence of context maximum. Be dense and restrained."
      }
    `;

  const lightweightLogs = getLightweightLogsForAI(logs, 6);

  try {
    const response = await siaClient.generateContentRaw(
      [
        {
          role: "user",
          parts: [{ text: `Recent Logs: ${JSON.stringify(lightweightLogs)}` }],
        },
        { role: "user", parts: [{ text: prompt }] },
      ],
      {
        systemInstruction: systemPrompt,
        temperature: 0.2, // Lowered for more precise, constrained output
        responseMimeType: "application/json",
      },
    );

    const contentText = response.text || "{}";
    const parsed: AIInsight = JSON.parse(
      contentText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim(),
    );

    if (db) {
      try {
        await setDoc(
          doc(db, "users", userId, "daily_briefs", currentDate),
          { insight: parsed, generatedAt: serverTimestamp() },
          { merge: true },
        );
      } catch (e) {
        console.warn("[SIA] Failed to persist daily brief to Firestore:", e);
      }
    }
    return parsed;
  } catch (e) {
    console.error("AI Brief Error:", e);
    return "Unable to generate brief.";
  }
};
