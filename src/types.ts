export type Lexeme = {
  text: string;
  translations: string[];
  audioURL: string;
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
  // Mistake tracking fields
  lastIncorrectAt?: number; // timestamp of last incorrect answer
  recentIncorrectStreak: number; // current streak of incorrect answers
  confusedWith: { [translation: string]: number }; // tracks which translations were confused
  easingLevel: number; // 0 = needs flashcard, 1 = normal, 2 = advanced
  // Mastery tracking fields
  consecutiveCorrectStreak: number; // current consecutive correct answers
  isMastered: boolean; // true once streak >= 5
  masteredAt?: number; // optional epoch when mastered
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
  isReverseMode?: boolean; // true if practiced English to Indonesian
};
