import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini SDK
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getCineBuddySuggestions(userMessage: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Tu es CineBuddy, un concierge cinéma expert et chaleureux.
L'utilisateur te dit : "${userMessage}"
Réponds en français. Si l'utilisateur demande une recommandation, propose 3 films ou séries. S'il pose une question générale sur le cinéma, réponds-y directement et chaleureusement.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: {
              type: Type.STRING,
              description: "Ta réponse à la question OU ton message d'introduction pour les recommandations"
            },
            recommendations: {
              type: Type.ARRAY,
              description: "Laisse ce tableau vide si c'est juste une question générale",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Titre du film/série" },
                  type: { type: Type.STRING, description: "movie ou tv" },
                  reason: { type: Type.STRING, description: "Pourquoi tu le recommandes" }
                },
                required: ["title", "type", "reason"]
              }
            }
          },
          required: ["message", "recommendations"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error('Gemini error:', error);
    return null;
  }
}
