import { aiClient as siaClient } from './core/aiClient';
import { SIA_EXTRACTOR_PERSONA } from './aiConstants';

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

export async function extractUnstructuredData(content: string) {
  let extracted = { summary: null, estimatedDateRange: null, extractedInsights: [], rawDataType: 'unknown' };
  try {
    const aiPromise = siaClient.generateContent(content.slice(0, 8000), {
      systemInstruction: SIA_EXTRACTOR_PERSONA,
      temperature: 0.4
    });

    const response = await withTimeout(aiPromise, 15000, "AI extraction timed out");
    const clean = (response?.text ?? '').replace(/```json|```/g, '').trim();
    extracted = JSON.parse(clean);
  } catch (aiError) {
    console.warn('AI extraction skipped — continuing with null metadata:', aiError);
  }
  return extracted;
}

export async function normalizeRowsWithAI(invalidRows: any[]) {
  try {
    const prompt = `
      The following data rows failed validation for a sleep tracking app. 
      Please attempt to normalize them into valid sleep log entries.
      
      Expected Schema for each entry:
      - Date: YYYY-MM-DD
      - Start_Time: HH:mm (24h format)
      - End_Time: HH:mm (24h format)
      - Status_Code: "SLEEP" or "AWAKE-IN"
      - SQ: number (0-10, optional)
      - R: number (0-10, optional)
      - L: number (0-10, optional)
      - Remarks: string (optional)
      - Caffeine_Y: "yes" or "no" (optional)
      - Alcohol_Y: "yes" or "no" (optional)
      
      Invalid Data:
      ${JSON.stringify(invalidRows.slice(0, 50), null, 2)}
      
      Return ONLY a JSON array of objects. If a row cannot be normalized, omit it from the array.
    `;

    const aiPromise = siaClient.generateContent(prompt, {
      temperature: 0.4
    });

    const response = await withTimeout(aiPromise, 25000, "AI normalization timed out");

    const text = response.text || '[]';
    const clean = text.replace(/```json|```/g, '').trim();
    
    try {
      const normalized = JSON.parse(clean);
      return Array.isArray(normalized) ? normalized : [];
    } catch (parseError) {
      console.error("AI JSON Parse Error:", parseError, "Raw text:", text);
      return [];
    }
  } catch (error) {
    console.error("AI Normalization failed:", error);
    return [];
  }
}
