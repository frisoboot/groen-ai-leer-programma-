import { GoogleGenAI, Content, Part, Type, Schema } from "@google/genai";
import { Message, Role, Subject, PracticeTurn, FlashcardSet, UserProfile } from "../types";
import { SYSTEM_INSTRUCTION_BASE } from "../constants";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to construct context-aware system instruction
const getSystemInstruction = (subject: Subject, profile: UserProfile) => {
  return `${SYSTEM_INSTRUCTION_BASE}
  
  BELANGRIJKE CONTEXT OVER DE LEERLING:
  - Naam: ${profile.name}
  - Niveau: ${profile.level.toUpperCase()}
  - Leerjaar: ${profile.year}
  - Vak: ${subject.name}
  
  Pas al je antwoorden, uitleg, moeilijkheidsgraad en taalgebruik specifiek aan op het curriculum van ${profile.level} leerjaar ${profile.year} in Nederland.
  Voor eindexamenjaren (VMBO 4, HAVO 5, VWO 6): Focus op het centraal eindexamen (CSE) en schoolexamen (SE) stof.
  
  Specifieke vakinstructie: ${subject.promptContext}`;
};

// --- CHAT FUNCTIONALITY ---

export const generateResponseStream = async (
  history: Message[],
  currentMessage: string,
  subject: Subject,
  profile: UserProfile,
  imageBase64?: string,
  mimeType?: string
): Promise<AsyncIterable<string>> => {
  
  const systemInstruction = getSystemInstruction(subject, profile);

  const contents: Content[] = history
    .filter(msg => !msg.isStreaming)
    .map((msg) => {
      const parts: Part[] = [];
      if (msg.imageUrl && msg.role === Role.USER) {
        const base64Data = msg.imageUrl.split(',')[1];
        const mime = msg.imageUrl.split(':')[1].split(';')[0];
        if (base64Data && mime) {
            parts.push({
                inlineData: { data: base64Data, mimeType: mime }
            });
        }
      }
      parts.push({ text: msg.text });
      return { role: msg.role === Role.USER ? 'user' : 'model', parts: parts };
    });

  const currentParts: Part[] = [];
  if (imageBase64 && mimeType) {
    currentParts.push({ inlineData: { data: imageBase64, mimeType: mimeType } });
  }
  currentParts.push({ text: currentMessage });
  contents.push({ role: 'user', parts: currentParts });

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    async function* streamGenerator() {
      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    }
    return streamGenerator();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// --- PRACTICE/QUIZ FUNCTIONALITY ---

const practiceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    feedback: {
      type: Type.OBJECT,
      nullable: true,
      description: "Feedback op het vorige antwoord. Null bij de start van de sessie.",
      properties: {
        isCorrect: { type: Type.BOOLEAN, description: "Of het antwoord grotendeels goed was." },
        score: { type: Type.INTEGER, description: "Score van 0 tot 10." },
        explanation: { type: Type.STRING, description: "Uitleg waarom het goed of fout is, inclusief tips." },
        modelAnswer: { type: Type.STRING, description: "Het ideale antwoord of de uitwerking." },
      },
      required: ["isCorrect", "score", "explanation", "modelAnswer"],
    },
    nextQuestion: {
      type: Type.OBJECT,
      description: "De volgende oefenvraag.",
      properties: {
        text: { type: Type.STRING, description: "De vraag zelf. Gebruik Markdown voor formules." },
        topic: { type: Type.STRING, description: "Het specifieke onderwerp (bijv. differentieren)." },
        difficulty: { type: Type.STRING, enum: ["makkelijk", "gemiddeld", "moeilijk"] },
      },
      required: ["text", "topic", "difficulty"],
    },
  },
  required: ["nextQuestion"],
};

export const getSuggestedTopics = async (subject: Subject, profile: UserProfile): Promise<string[]> => {
    const prompt = `Geef een lijst van 8 tot 12 concrete examenonderwerpen of hoofdstukken voor het vak ${subject.name} voor ${profile.level} leerjaar ${profile.year} in Nederland.
    Houd de onderwerpen kort (max 3-4 woorden).`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                systemInstruction: getSystemInstruction(subject, profile),
            },
        });

        if (response.text) {
            return JSON.parse(response.text) as string[];
        }
        return [];
    } catch (error) {
        console.error("Fetch Topics Error:", error);
        return [];
    }
}

export const startPracticeSession = async (subject: Subject, profile: UserProfile, topic?: string): Promise<PracticeTurn> => {
  const userTopic = topic ? `Focus uitsluitend op de volgende onderwerpen: "${topic}".` : "Kies een willekeurig belangrijk onderwerp uit het examenprogramma.";

  const prompt = `Start een oefensessie voor ${profile.level} leerjaar ${profile.year} voor het vak ${subject.name}. 
  ${userTopic}
  Genereer de eerste vraag. Het moet een open vraag zijn.
  Zorg dat de vraag aansluit bij het officiële Nederlandse curriculum voor dit niveau en jaar.
  Begin met een vraag van gemiddeld niveau.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: practiceSchema,
        systemInstruction: getSystemInstruction(subject, profile),
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as PracticeTurn;
    }
    throw new Error("Geen antwoord van AI");
  } catch (error) {
    console.error("Practice Session Start Error:", error);
    throw error;
  }
};

export const submitAnswerAndGetNext = async (
  subject: Subject,
  history: Content[],
  userAnswer: string,
  profile: UserProfile
): Promise<{ turn: PracticeTurn; updatedHistory: Content[] }> => {
  
  const userContent: Content = {
    role: 'user',
    parts: [{ text: `Mijn antwoord is: ${userAnswer}. Beoordeel dit streng maar rechtvaardig op ${profile.level} niveau. Geef feedback en daarna de volgende vraag.` }]
  };

  const newHistory = [...history, userContent];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: newHistory,
      config: {
        responseMimeType: "application/json",
        responseSchema: practiceSchema,
        systemInstruction: getSystemInstruction(subject, profile),
      },
    });

    if (response.text) {
      const turn = JSON.parse(response.text) as PracticeTurn;
      const modelContent: Content = {
        role: 'model',
        parts: [{ text: response.text }]
      };
      
      return {
        turn,
        updatedHistory: [...newHistory, modelContent]
      };
    }
    throw new Error("Geen antwoord van AI");
  } catch (error) {
    console.error("Practice Turn Error:", error);
    throw error;
  }
};

// --- FLASHCARD FUNCTIONALITY ---

const flashcardSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING, description: "Het onderwerp van deze set kaarten." },
    cards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          front: { type: Type.STRING, description: "De term, vraag of concept op de voorkant." },
          back: { type: Type.STRING, description: "De definitie, antwoord of uitleg op de achterkant." },
          category: { type: Type.STRING, description: "Categorie (bijv. 'Definitie', 'Formule', 'Jaartal')" },
        },
        required: ["front", "back", "category"],
      },
    },
  },
  required: ["topic", "cards"],
};

export const generateFlashcards = async (subject: Subject, profile: UserProfile, topic?: string): Promise<FlashcardSet> => {
  const userTopic = topic ? `over het onderwerp: "${topic}"` : "over de belangrijkste lesstof voor dit jaar";
  
  const prompt = `Genereer een set van 10 flashcards voor ${profile.level} leerjaar ${profile.year} voor het vak ${subject.name} ${userTopic}.
  Zorg dat de begrippen en moeilijkheid aansluiten bij het niveau.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: flashcardSchema,
        systemInstruction: getSystemInstruction(subject, profile),
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as FlashcardSet;
    }
    throw new Error("Geen antwoord van AI");
  } catch (error) {
    console.error("Flashcard Gen Error:", error);
    throw error;
  }
};