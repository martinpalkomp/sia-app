class SiaClient {
  async generateContentRaw(contents: any[], config: any) {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents, config }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate content');
    }

    return await response.json();
  }

  async generateContent(prompt: string, config: any) {
    return this.generateContentRaw([{ role: "user", parts: [{ text: prompt }] }], config);
  }
}

export const siaClient = new SiaClient();
