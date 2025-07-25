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
  // SM-2 algorithm fields
  easinessFactor: number; // default 2.5, range [1.3, 2.6]
  intervalDays: number; // days until next review (1, 6, 14, ...)
  nextDue: number; // epoch ms when word is due for review
  consecutiveCorrect: number; // current success streak
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
