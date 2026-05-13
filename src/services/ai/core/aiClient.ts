export class AIClient {
  async generateContentRaw(contents: any[], config: any) {
    const res = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents, 
        config
      }),
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      if (!res.ok) throw new Error(`API route error: ${res.status}`);
    }

    if (!res.ok) {
      throw new Error(data?.error || `API route error: ${res.status}`);
    }
    if (data.error) throw new Error(data.error);

    return { text: data.text as string };
  }

  async generateContent(prompt: string, config?: any) {
    return this.generateContentRaw([{ role: 'user', parts: [{ text: prompt }] }], config);
  }
}

export const aiClient = new AIClient();
