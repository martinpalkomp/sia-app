import { siaClient } from './SiaClient';
import { DailyLog } from '../../types';

import { SIA_DISCLAIMER, SIA_INSIGHTS_PERSONA } from './aiConstants';

export const generatePatternTeaser = async (logs: DailyLog[]): Promise<string> => {
    const prompt = `
  Analyze the last 14 nights of sleep data: ${JSON.stringify(logs.slice(0, 14))}

  Return TWO things in exactly this format:
  PATTERN: [One sentence identifying the most consistent sleep pattern across the 14 nights]
  CORRELATION: [One sentence linking one lifestyle factor (caffeine/alcohol/exercise/stress) to a sleep metric (quality/efficiency/duration)]

  Total response: 2 sentences maximum. No preamble. No disclaimer needed.
`;

    const response = await siaClient.generateContent(prompt, {
        systemInstruction: SIA_INSIGHTS_PERSONA,
        temperature: 0.7
    });

    const content = response.text || "Unable to generate teaser.";
    
    return `${content}\n\n***\n\n${SIA_DISCLAIMER}`;
};
