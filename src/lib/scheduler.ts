import type { Lexeme, LexemeProgress } from "@/types";

// Score a lexeme for selection (higher score = more likely to be selected)
export const scoreLexeme = (lexeme: Lexeme, progress: LexemeProgress | undefined): number => {
  // New words get high priority
  if (!progress) {
    return lexeme.isNew ? 100 : 80;
  }

  let score = 0;

  // 1. Accuracy factor (0-50 points)
  // Lower accuracy = higher priority
  const accuracy = progress.timesSeen > 0 ? progress.timesCorrect / progress.timesSeen : 0;
  score += (1 - accuracy) * 50;

  // 2. Times seen factor (0-30 points)
  // Fewer times seen = higher priority
  if (progress.timesSeen === 0) score += 30;
  else if (progress.timesSeen < 3) score += 20;
  else if (progress.timesSeen < 5) score += 10;

  // 3. Recency penalty (0-20 points)
  // Recently practiced words get lower priority
  const now = Date.now();
  const hoursSinceLastPractice = (now - progress.lastPracticedAt) / (1000 * 60 * 60);
  if (hoursSinceLastPractice < 1) {
    score -= 20; // Just practiced
  } else if (hoursSinceLastPractice < 6) {
    score -= 10; // Practiced recently
  }

  // 4. Mastered words get lowest priority
  if (progress.mastered) {
    score = Math.max(0, score * 0.1); // Reduce score by 90%
  }

  return Math.max(0, score);
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
