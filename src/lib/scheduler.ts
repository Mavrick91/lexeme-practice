import type { Lexeme, LexemeProgress } from "@/types";
import { LEARNING_CONFIG } from "@/config/learning";

// Calculate mistake score for a lexeme
const calculateMistakeScore = (progress: LexemeProgress): number => {
  if (!progress || progress.timesSeen === 0) return 0;

  let mistakeScore = 0;
  const timesIncorrect = progress.timesSeen - progress.timesCorrect;

  // Base mistake score (0-30 points)
  mistakeScore += timesIncorrect * 10;

  // Recent incorrect streak bonus (0-20 points)
  mistakeScore += progress.recentIncorrectStreak * 10;

  // Recency bonus for recent mistakes (0-20 points)
  if (progress.lastIncorrectAt) {
    const hoursSinceLastIncorrect = (Date.now() - progress.lastIncorrectAt) / (1000 * 60 * 60);
    if (hoursSinceLastIncorrect < LEARNING_CONFIG.RECENT_INCORRECT_HOURS) {
      const recencyBonus =
        20 * Math.pow(LEARNING_CONFIG.RECENCY_DECAY_FACTOR, hoursSinceLastIncorrect);
      mistakeScore += recencyBonus;
    }
  }

  // Easing level bonus (0-10 points)
  if (progress.easingLevel === 0) {
    mistakeScore += 10; // Needs flashcard mode
  }

  return mistakeScore;
};

// Score a lexeme for selection (higher score = more likely to be selected)
export const scoreLexeme = (lexeme: Lexeme, progress: LexemeProgress | undefined): number => {
  // New words get high priority
  if (!progress) {
    return 100; // unseen words still get highest priority
  }

  let baseScore = 0;

  // 1. Accuracy factor (0-50 points)
  // Lower accuracy = higher priority
  const accuracy = progress.timesSeen > 0 ? progress.timesCorrect / progress.timesSeen : 0;
  baseScore += (1 - accuracy) * 50;

  // 2. Times seen factor (0-30 points)
  // Fewer times seen = higher priority
  if (progress.timesSeen === 0) baseScore += 30;
  else if (progress.timesSeen < 3) baseScore += 20;
  else if (progress.timesSeen < 5) baseScore += 10;

  // 3. Recency penalty (0-20 points)
  // Recently practiced words get lower priority
  const now = Date.now();
  const hoursSinceLastPractice = (now - progress.lastPracticedAt) / (1000 * 60 * 60);
  if (hoursSinceLastPractice < 1) {
    baseScore -= 20; // Just practiced
  } else if (hoursSinceLastPractice < 6) {
    baseScore -= 10; // Practiced recently
  }

  // 5. Add mistake score with weight
  const mistakeScore = calculateMistakeScore(progress);
  const finalScore = baseScore + mistakeScore * LEARNING_CONFIG.MISTAKE_WEIGHT;

  return Math.max(0, finalScore);
};

// Select next lexemes to practice
export const selectNextLexemes = (
  allLexemes: Lexeme[],
  progressMap: Map<string, LexemeProgress>,
  count: number = 50,
  excludeSet: Set<string> = new Set()
): Lexeme[] => {
  // Score all lexemes
  const scoredLexemes = allLexemes
    .filter((lexeme) => !excludeSet.has(lexeme.text))
    .map((lexeme) => ({
      lexeme,
      score: scoreLexeme(lexeme, progressMap.get(lexeme.text)),
    }))
    .filter((item) => item.score > 0); // Filter out zero-score items

  // Sort by score (highest first) with some randomization for variety
  scoredLexemes.sort((a, b) => {
    // Add small random factor for variety (±10% of score)
    const aScore = a.score * (0.9 + Math.random() * 0.2);
    const bScore = b.score * (0.9 + Math.random() * 0.2);
    return bScore - aScore;
  });

  // Return top N lexemes
  return scoredLexemes.slice(0, count).map((item) => item.lexeme);
};
