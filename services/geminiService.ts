import { GoogleGenAI } from "@google/genai";
import { Match, Player, Discipline } from "../types";

const getAIClient = () => {
  if (!process.env.API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateMatchCommentary = async (
  match: Match,
  p1: Player,
  p2: Player,
  discipline: Discipline
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Chiave API mancante. Impossibile generare il commento.";

  const prompt = `
    Sei un commentatore sportivo entusiasta ed esagerato delle "Nolimpiadi".
    Scrivi un breve commento (max 2 frasi) per la partita di ${discipline.name} appena conclusa.
    ${p1.name} ha segnato ${match.score1} punti.
    ${p2.name} ha segnato ${match.score2} punti.
    Il vincitore è ${match.score1! > match.score2! ? p1.name : p2.name}.
    Usa un tono divertente, stile telecronaca epica.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Impossibile contattare il commentatore virtuale.";
  }
};

export const analyzeStandings = async (
  standingsText: string,
  disciplineName: string
): Promise<string> => {
    const ai = getAIClient();
    if (!ai) return "Chiave API mancante.";

    const prompt = `
      Analizza questa classifica delle Nolimpiadi per la disciplina ${disciplineName}.
      Dati: ${standingsText}
      Chi è la sorpresa? Chi sta deludendo? Fai una previsione sarcastica sui primi 6 che andranno alle finali.
      Sii breve (max 3 frasi).
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
        return "Analisi non disponibile al momento.";
    }
}
