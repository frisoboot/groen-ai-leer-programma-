export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export enum AppMode {
  CHAT = 'chat',
  PRACTICE = 'practice',
  EXAM = 'exam',
  FLASHCARDS = 'flashcards',
  SYLLABUS = 'syllabus',
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
  examDomains: string[]; // Added official curriculum domains
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

// Practice Mode Types
export interface QuizFeedback {
  isCorrect: boolean;
  score: number;
  explanation: string;
  modelAnswer: string;
}

export interface Attachment {
  type: 'text' | 'image';
  title?: string;
  content: string; // URL/Base64 for image, or text content for text type
}

export interface QuizQuestion {
  text: string;
  topic: string;
  difficulty: 'makkelijk' | 'gemiddeld' | 'moeilijk';
  source?: string; // Added source for exam year/period
  hint: string; // Added hint field
  attachment?: Attachment | null;
}

export interface PracticeTurn {
  feedback?: QuizFeedback | null;
  nextQuestion: QuizQuestion;
}

// Flashcard Mode Types
export interface Flashcard {
  front: string;
  back: string;
  category: string;
}

export interface FlashcardSet {
  topic: string;
  cards: Flashcard[];
}