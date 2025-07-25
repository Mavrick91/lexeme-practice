export type Lexeme = {
  text: string;
  translations: string[];
  audioURL: string;
  isNew: boolean;
  phonetic?: string;
  example?: string;
};

export type LexemesData = {
  learnedLexemes: Lexeme[];
};

export type LexemeProgress = {
  text: string;
  timesSeen: number;
  timesCorrect: number;
  lastPracticedAt: number; // epoch ms
  mastered: boolean;
};

export type UserStats = {
  totalSeen: number;
  totalCorrect: number;
  lastPracticedAt: number | null;
};

export type PracticeHistoryItem = {
  id: string;
  word: string;
  translation: string[];
  isCorrect: boolean;
  timestamp: number;
};
