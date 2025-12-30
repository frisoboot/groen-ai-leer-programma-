export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export enum AppMode {
  CHAT = 'chat',
  PRACTICE = 'practice',
  FLASHCARDS = 'flashcards',
}

export type EducationLevel = 'vmbo-tl' | 'havo' | 'vwo';

export interface UserProfile {
  name: string;
  level: EducationLevel;
  year: number;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
  imageUrl?: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  promptContext: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

// Practice Mode Types
export interface QuizQuestion {
  text: string;
  topic: string;
  difficulty: 'makkelijk' | 'gemiddeld' | 'moeilijk';
}

export interface QuizFeedback {
  isCorrect: boolean;
  score: number; // 0-10
  explanation: string;
  modelAnswer: string;
}

export interface PracticeTurn {
  feedback?: QuizFeedback; // Optional because the first turn has no feedback
  nextQuestion: QuizQuestion;
}

// Flashcard Types
export interface Flashcard {
  front: string;
  back: string;
  category: string;
}

export interface FlashcardSet {
  topic: string;
  cards: Flashcard[];
}