import { GoogleGenAI, Content, Part, Type, Schema } from "@google/genai";
import { Message, Role, Subject, PracticeTurn, FlashcardSet, UserProfile, QuizQuestion } from "../types";
import { SYSTEM_INSTRUCTION_BASE } from "../constants";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper for specific pedagogical strategies per level
const getPedagogicalStrategy = (level: string) => {
  switch (level) {
    case 'vmbo-tl':
      return `PEDAGOGISCHE AANPAK VOOR VMBO-TL (MAVO):
      - Taalgebruik: Eenvoudig, concreet en helder. Vermijd onnodig jargon of leg het direct uit.
      - Uitleg: Stap-voor-stap (1, 2, 3). Gebruik veel alledaagse praktijkvoorbeelden.
      - Focus: 'Hoe werkt het?' en 'Wat moet ik doen?'. Wees niet te abstract.`;
    case 'havo':
      return `PEDAGOGISCHE AANPAK VOOR HAVO:
      - Taalgebruik: Formeel maar toegankelijk.
      - Uitleg: Focus op de toepassing van theorie in contexten.
      - Focus: 'Hoe pas ik deze regel toe in deze situatie?'.`;
    case 'vwo':
      return `PEDAGOGISCHE AANPAK VOOR VWO:
      - Taalgebruik: Academisch en exact. Gebruik correcte vakterminologie.
      - Uitleg: Focus op inzicht, abstractie, bewijsvoering en verbanden tussen onderwerpen.
      - Focus: 'Waarom werkt dit zo?' en complexe analyses.`;
    default:
      return '';
  }
};

// Helper to construct context-aware system instruction
const getSystemInstruction = (subject: Subject, profile: UserProfile) => {
  // We voegen de officiële examendomeinen toe aan de context
  const domainsList = subject.examDomains.map(d => `- ${d}`).join('\n');

  return `${SYSTEM_INSTRUCTION_BASE}
  
  BELANGRIJKE CONTEXT OVER DE LEERLING:
  - Naam: ${profile.name}
  - Niveau: ${profile.level.toUpperCase()}
  - Leerjaar: ${profile.year}
  - Vak: ${subject.name}
  
  OFFICIËLE EXAMENDOMEINEN (EXAMENPROGRAMMA):
  Je mag UITSLUITEND vragen en antwoorden genereren die passen binnen de volgende domeinen voor dit specifieke vak:
  ${domainsList}

  ${getPedagogicalStrategy(profile.level)}

  Pas al je antwoorden, uitleg, moeilijkheidsgraad en taalgebruik specifiek aan op het curriculum van ${profile.level} leerjaar ${profile.year} in Nederland.
  Voor eindexamenjaren (VMBO 4, HAVO 5, VWO 6): Focus op het centraal eindexamen (CSE) en schoolexamen (SE) stof zoals vastgesteld door het CvTE.
  
  Specifieke vakinstructie: ${subject.promptContext}`;
};

const isLanguageSubject = (subjectId: string) => {
    return ['engels', 'nederlands', 'duits', 'frans', 'spaans'].includes(subjectId);
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
        // If it is a base64 data URL
        if (msg.imageUrl.startsWith('data:')) {
            const base64Data = msg.imageUrl.split(',')[1];
            const mime = msg.imageUrl.split(':')[1].split(';')[0];
            if (base64Data && mime) {
                parts.push({
                    inlineData: { data: base64Data, mimeType: mime }
                });
            }
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

const feedbackSchema: Schema = {
  type: Type.OBJECT,
  description: "Feedback op het vorige antwoord.",
  properties: {
    isCorrect: { type: Type.BOOLEAN, description: "Of het antwoord grotendeels goed was." },
    score: { type: Type.INTEGER, description: "Score van 0 tot 10." },
    explanation: { type: Type.STRING, description: "Uitleg waarom het goed of fout is, inclusief tips." },
    modelAnswer: { type: Type.STRING, description: "Het ideale antwoord of de uitwerking." },
  },
  required: ["isCorrect", "score", "explanation", "modelAnswer"],
};

const questionSchema: Schema = {
  type: Type.OBJECT,
  description: "De volgende oefenvraag.",
  properties: {
    text: { type: Type.STRING, description: "De vraag zelf. Markdown toegestaan." },
    topic: { type: Type.STRING, description: "Het specifieke onderwerp." },
    difficulty: { type: Type.STRING, enum: ["makkelijk", "gemiddeld", "moeilijk"] },
    source: { type: Type.STRING, description: "Bron van de vraag (Bijv: 'Examen 2023-I' of 'AI gegenereerd').", nullable: true },
    hint: { type: Type.STRING, description: "Een subtiele hint om de leerling op weg te helpen als ze vastlopen." },
    attachment: {
        type: Type.OBJECT,
        nullable: true,
        description: "Een optionele bijlage bij de vraag.",
        properties: {
            type: { type: Type.STRING, enum: ["text", "image"] },
            title: { type: Type.STRING, description: "Titel van de bijlage.", nullable: true },
            content: { type: Type.STRING, description: "De inhoud." }
        },
        required: ["type", "content"]
    }
  },
  required: ["text", "topic", "difficulty", "hint"],
};

// Original full schema (feedback + next question generated together)
const practiceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    feedback: { ...feedbackSchema, nullable: true },
    nextQuestion: questionSchema,
  },
  required: ["nextQuestion"],
};

export const getSuggestedTopics = async (subject: Subject, profile: UserProfile): Promise<string[]> => {
    // We geven de domeinen mee in de prompt om suggesties te sturen
    const domainContext = subject.examDomains.join(', ');
    
    const prompt = `Geef een lijst van 8 tot 12 concrete examenonderwerpen of hoofdstukken voor het vak ${subject.name} voor ${profile.level} leerjaar ${profile.year} in Nederland.
    
    De onderwerpen moeten vallen binnen deze officiële domeinen: ${domainContext}.
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

export const startPracticeSession = async (
    subject: Subject, 
    profile: UserProfile, 
    topic?: string, 
    isRealExam: boolean = false
): Promise<{ turn: PracticeTurn, prompt: string }> => {
  
  // STANDARD AI GENERATED MODE
  let userTopic = topic 
    ? `Focus uitsluitend op de volgende onderwerpen: "${topic}".` 
    : `Kies een willekeurig belangrijk onderwerp binnen de officiële examendomeinen: ${subject.examDomains.join(', ')}.`;

  if (isRealExam) {
      userTopic += ` HAAL EEN BESTAANDE VRAAG OP UIT EEN ECHT EINDEXAMEN (CSE) VAN ${profile.level.toUpperCase()} UIT DE JAREN 2021-2024 (Afgelopen 4 jaar).
      Citeer de vraag letterlijk.
      Vermeld in het veld 'source' uit welk jaar en welk tijdvak (I of II) de vraag komt (bijv: "Examen 2023-II").`;
  } else {
      userTopic += ` Genereer een nieuwe, unieke oefenvraag die lijkt op een examenvraag. Zet 'AI Generatie' in het 'source' veld.`;
  }

  const languageInstruction = isLanguageSubject(subject.id) 
    ? "BELANGRIJK VOOR TALEN: Genereer ALTIJD een bijlage (attachment) van het type 'text' met een relevante tekst/fragment waar de vraag over gaat. Stel de vraag over deze bijlage." 
    : "Genereer GEEN afbeeldingen of figuren. Beschrijf eventuele situaties duidelijk in de tekst.";
    
  const prompt = `Start een ${isRealExam ? 'echte examentraining' : 'oefensessie'} voor ${profile.level} leerjaar ${profile.year} voor het vak ${subject.name}. 
  ${userTopic}
  ${languageInstruction}
  Genereer de eerste vraag. Het moet een open vraag zijn.
  Zorg dat de vraag STRICT aansluit bij het officiële Nederlandse curriculum (Examenprogramma) voor dit niveau.
  Zorg dat je het 'hint' veld invult met een nuttige aanwijzing, maar geef deze hint NIET in de 'text' van de vraag.`;

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
      const turn = JSON.parse(response.text) as PracticeTurn;
      return { turn, prompt };
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
  profile: UserProfile,
  isRealExam: boolean = false
): Promise<{ turn: PracticeTurn; updatedHistory: Content[] }> => {
  
  // --- STANDARD AI FLOW ---

  const languageInstruction = isLanguageSubject(subject.id) 
  ? "Indien de volgende vraag een nieuwe tekst vereist, genereer deze in het 'attachment' object (type 'text')." 
  : "Gebruik GEEN attachments of afbeeldingen. Beschrijf alles in de tekst.";

  let examInstruction = "";
  if (isRealExam) {
      examInstruction = "De volgende vraag moet OOK een echte examenvraag uit 2021-2024 zijn. Vermeld de bron weer in het 'source' veld.";
  }

  const userContent: Content = {
    role: 'user',
    parts: [{ text: `Mijn antwoord is: ${userAnswer}. Beoordeel dit streng maar rechtvaardig op ${profile.level} niveau. Geef feedback en daarna de volgende vraag. ${languageInstruction} ${examInstruction}. Vul ook voor de volgende vraag weer een aparte hint in.` }]
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
        parts: [{ text: JSON.stringify(turn) }]
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

export const generateQuizSummary = async (
    subject: Subject,
    history: Content[],
    profile: UserProfile
  ): Promise<string> => {
    const prompt = `De oefentoets is voorbij. Analyseer de bovenstaande conversatie (die JSON objecten met vragen en feedback bevat) om te zien hoe de leerling het gedaan heeft.
    Schrijf een korte, opbouwende samenvatting (ongeveer 100-150 woorden) voor de leerling (${profile.level} ${profile.year}).
    
    Onderdelen:
    1. Een compliment over wat goed ging.
    2. Een concreet verbeterpunt of onderwerp waar de leerling nog op moet letten (bijv. "Let op je eenheden" of "Oefen meer met de kettingregel").
    3. Een afsluitende succeswens.
    
    Spreek de leerling direct aan met 'je'. Gebruik Markdown opmaak.`;
  
    // We voegen deze prompt toe aan de historie zodat de AI context heeft
    const summaryContent: Content = {
      role: 'user',
      parts: [{ text: prompt }]
    };
    
    const summaryHistory = [...history, summaryContent];
  
    try {
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: summaryHistory,
          config: {
              systemInstruction: getSystemInstruction(subject, profile),
              temperature: 0.7,
          },
      });
      return response.text || "Geen samenvatting beschikbaar.";
    } catch (error) {
      console.error("Summary Gen Error", error);
      return "Kon geen samenvatting genereren.";
    }
  }

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
  const userTopic = topic 
    ? `over het onderwerp: "${topic}"` 
    : `over de belangrijkste examenstof binnen de domeinen: ${subject.examDomains.join(', ')}`;
  
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