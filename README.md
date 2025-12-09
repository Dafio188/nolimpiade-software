# 🏅 Nolimpiadi OS

**Nolimpiadi OS** è una Web Application avanzata sviluppata in React e TypeScript per la gestione completa di un torneo olimpico amatoriale. L'applicazione utilizza un'interfaccia stile "Sistema Operativo" con finestre, dock e widget galleggianti.

## ✨ Caratteristiche Principali

### 1. 🧠 Gestione Ibrida Squadre/Singoli
Questa è la logica cuore del torneo:
*   **Fase Gironi (2vs2):** I 12 giocatori vengono abbinati in squadre bilanciate (basate sul peso/categoria: Adulto+Ragazzo o Giovane+Giovane) tramite un algoritmo interno. Sebbene si giochi in coppia, i punti (Vittoria=3, Pareggio=1, Sconfitta=0) vengono assegnati al **singolo atleta**.
*   **Classifiche Individuali:** Non esistono classifiche a squadre. Ogni giocatore accumula punti personali in base ai risultati ottenuti con il proprio compagno.
*   **Fasi Finali (1vs1):** I primi **6 classificati** di ogni disciplina accedono alle fasi finali che si giocano **singolarmente**.
    *   1° e 2° classificato: Accesso diretto alle Semifinali.
    *   3°, 4°, 5°, 6° classificato: Giocano i Quarti di Finale.

### 2. 🤖 Intelligenza Artificiale (Gemini Flash)
L'app integra le API di Google Gemini (`@google/genai`) in due modalità:
*   **Analisi Classifiche:** Nella vista classifiche, l'AI analizza l'andamento, identifica le sorprese e fa previsioni sarcastiche.
*   **Chatbot Assistente (Floating Widget):** Un assistente virtuale sempre disponibile (bottone viola in basso a destra) a cui si può chiedere in linguaggio naturale:
    *   *"Chi è primo a Ping Pong?"*
    *   *"Quante partite ha vinto Mario?"*
    *   *"Riassumi la situazione del torneo."*
    L'assistente riceve in tempo reale tutto il contesto (partite, giocatori, squadre) per rispondere.

### 3. 📅 Tabellone Live Intelligente
Il componente `LiveSchedule` utilizza un algoritmo di simulazione temporale per proiettare gli incontri su 4 campi (discipline) simultaneamente.
*   **Anti-Conflitto:** L'algoritmo assicura che un atleta non venga mai programmato in due partite contemporanee su discipline diverse.
*   **Stato Real-Time:** Mostra le partite "In Corso", "Successive" e "Future".

### 4. 🛠 Gestione Utenti & Admin
*   **Ruoli:** Sistema a permessi `MASTER` (Admin) e `PLAYER` (Visualizzazione).
*   **CRUD Completo:** Il Master può aggiungere, modificare ed eliminare atleti.
*   **Peso & Categorie:** Assegnazione automatica del peso (2, 4, 6) in base alla categoria (Ragazzo, Giovane, Adulto) per il bilanciamento squadre.

---

## 📂 Struttura del Progetto

```
/
├── components/
│   ├── AIAssistant.tsx    # Widget Chatbot Galleggiante con Gemini
│   ├── Bracket.tsx        # Visualizzazione Tabellone Finali (Albero)
│   ├── Dock.tsx           # Barra di navigazione stile MacOS
│   ├── LiveSchedule.tsx   # Tabellone orari con algoritmo anti-conflitto
│   ├── MatchList.tsx      # Lista partite, filtri e inserimento risultati
│   ├── Standings.tsx      # Classifiche individuali e calcolo punteggi
│   └── UserManager.tsx    # Pannello Admin per gestione atleti
├── services/
│   ├── geminiService.ts   # Chiamate API a Google Gemini
│   └── storageService.ts  # Gestione persistenza dati (LocalStorage) simulando un DB
├── App.tsx                # Main Entry, Routing logico, Layout OS
├── constants.ts           # Configurazioni (Discipline, Punteggi, Giocatori Seed)
├── types.ts               # Definizioni TypeScript (Interfacce e Tipi)
└── index.tsx              # React Entry Point
```

## 🚀 Installazione e Avvio

1.  **Requisiti:** Node.js installato.
2.  **Variabili d'Ambiente:** È necessaria una API Key di Google Gemini.
    Creare un file o configurare l'ambiente con:
    `process.env.API_KEY = "LA_TUA_CHIAVE_GEMINI"`
3.  **Installazione Dipendenze:**
    ```bash
    npm install react react-dom lucide-react @google/genai uuid
    ```
4.  **Avvio:**
    ```bash
    npm start
    ```

## 💾 Persistenza Dati
L'applicazione utilizza il `LocalStorage` del browser per salvare:
*   Utenti e Atleti
*   Squadre generate
*   Risultati delle partite

Per resettare il torneo, è sufficiente pulire la cache del browser o cancellare la chiave `nolimpiadi_initialized_v2` dal LocalStorage.

## 🎨 Design System
*   **Libreria:** Tailwind CSS
*   **Stile:** Glassmorphism (effetti blur, trasparenze, bordi sottili).
*   **Icone:** Lucide React.
*   **Responsive:** Adattabile da Desktop a Mobile (la Dock e il Chatbot si ridimensionano).

---
*Powered by Google Gemini 2.5 Flash & React 19*
