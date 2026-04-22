import { siaClient } from './SiaClient';
import { DailyLog } from '../../types';

const DISCLAIMER = "SIA provides lifestyle recommendations based on patterns. This is not a medical diagnosis. Consult a professional for clinical concerns.";

export const generatePatternTeaser = async (logs: DailyLog[]): Promise<string> => {
    const prompt = `
      Analyze recent sleep logs: ${JSON.stringify(logs.slice(0, 14))}
      Provide a concise summary of the sleep patterns identified.
      LIMIT: STRICTLY 5 sentences.
      Format: "Insight: [Your 5-sentence insight here]"
    `;

    const response = await siaClient.generateContent(prompt, {
        systemInstruction: "You are SIA, a Sleep Intelligence Agent. Provide deep, concise, data-backed sleep insights.",
        temperature: 0.7
    });

    const content = response.text || "Unable to generate teaser.";
    
    return `${content}\n\n***\n\n${DISCLAIMER}`;
};
