import { GoogleGenAI } from "@google/genai";
import { Match, Player, Team } from "../types";
import { DISCIPLINES } from "../constants";

const getAIClient = () => {
  if (!process.env.API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      return response.text || "Nessuna risposta.";
    } catch (error) {
        return "Analisi non disponibile al momento.";
    }
}

export const askTournamentAssistant = async (
    query: string,
    players: Player[],
    matches: Match[],
    teams: Team[]
): Promise<string> => {
    const ai = getAIClient();
    if (!ai) return "Chiave API mancante. Configura l'ambiente.";

    // Prepare Context Data
    const playersList = players.map(p => `${p.name} (ID: ${p.id})`).join(', ');
    const teamsList = teams.map(t => `Team ${t.name} (Players: ${t.playerIds.join(', ')})`).join('; ');
    
    const completedMatches = matches.filter(m => m.isCompleted).map(m => {
        const d = DISCIPLINES.find(disc => disc.id === m.disciplineId)?.name;
        // Resolve names (could be team or player)
        const getName = (id: string) => {
            const t = teams.find(x => x.id === id);
            if (t) return t.name;
            const p = players.find(x => x.id === id);
            return p ? p.name : id;
        }
        return `[${d}] ${getName(m.player1Id)} vs ${getName(m.player2Id)}: ${m.score1}-${m.score2}`;
    }).join('\n');

    const prompt = `
        Sei l'assistente virtuale ufficiale delle "Nolimpiadi". Hai accesso a tutti i dati del torneo.
        
        CONTESTO DATI:
        Atleti: ${playersList}
        Squadre: ${teamsList}
        Risultati Partite Concluse:
        ${completedMatches}
        
        DOMANDA UTENTE: "${query}"
        
        ISTRUZIONI:
        Rispondi alla domanda dell'utente basandoti ESCLUSIVAMENTE sui dati forniti sopra.
        Se ti chiedono classifiche, calcolale mentalmente basandoti sulle vittorie (3 punti), pareggi (1 punto) e sconfitte (0 punti).
        Sii simpatico, un po' sportivo, ma preciso coi numeri.
        Se non sai la risposta o non ci sono abbastanza dati, dillo chiaramente.
        Rispondi in italiano.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "Non ho capito, puoi ripetere?";
    } catch (error) {
        console.error("Gemini Chat Error", error);
        return "Scusa, il mio cervello elettronico è in sovraccarico. Riprova tra poco.";
    }
};
