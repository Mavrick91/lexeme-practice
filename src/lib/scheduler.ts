import type { Lexeme, LexemeProgress } from "@/types";

// SM-2 Algorithm Constants
const MIN_EASINESS_FACTOR = 1.3;
const MAX_EASINESS_FACTOR = 2.6;

// Scoring weights for priority calculation
const WEIGHTS = {
  overdue: 10, // Weight for overdue words
  accuracy: 5, // Weight for low accuracy
  difficulty: 3, // Weight for difficulty (lower EF = harder)
  recency: -8, // Penalty for recently seen words
  newWord: 7, // Bonus for new words
};

// Time constants
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const RECENCY_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// Calculate quality score based on user response
export function calculateQuality(isCorrect: boolean, responseTimeMs?: number): number {
  if (!isCorrect) return 2; // Incorrect answer

  // For correct answers, consider response time if available
  if (responseTimeMs !== undefined) {
    // Fast response (< 3s) = quality 5
    // Medium response (3-7s) = quality 4
    // Slow response (> 7s) = quality 3
    if (responseTimeMs < 3000) return 5;
    if (responseTimeMs < 7000) return 4;
    return 3;
  }

  // Default quality for correct answer
  return 4;
}

// Update easiness factor based on quality
export function updateEasinessFactor(currentEF: number, quality: number): number {
  const newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(MIN_EASINESS_FACTOR, Math.min(MAX_EASINESS_FACTOR, newEF));
}

// Calculate next interval based on SM-2 algorithm
export function calculateNextInterval(
  quality: number,
  previousInterval: number,
  easinessFactor: number
): number {
  if (quality < 3) {
    // Failed - reset to 1 day
    return 1;
  }

  if (previousInterval === 0) {
    // First review
    return 1;
  } else if (previousInterval === 1) {
    // Second review
    return 6;
  } else {
    // Subsequent reviews
    return Math.round(previousInterval * easinessFactor);
  }
}

// Calculate priority score for a lexeme
export function scoreLexeme(
  lexeme: Lexeme,
  progress: LexemeProgress | undefined,
  now: number = Date.now()
): number {
  // Default progress for new words
  if (!progress) {
    return WEIGHTS.newWord * 10; // High priority for completely new words
  }

  let score = 0;

  // 1. Overdue boost - higher score for more overdue words
  const overdueDays = Math.max(0, (now - progress.nextDue) / DAY_MS);
  score += WEIGHTS.overdue * overdueDays;

  // 2. Accuracy penalty - prioritize words with lower accuracy
  const accuracy = progress.timesSeen > 0 ? progress.timesCorrect / progress.timesSeen : 0;
  score += WEIGHTS.accuracy * (1 - accuracy);

  // 3. Difficulty factor - prioritize harder words (lower EF)
  const difficultyFactor =
    (MAX_EASINESS_FACTOR - progress.easinessFactor) / (MAX_EASINESS_FACTOR - MIN_EASINESS_FACTOR);
  score += WEIGHTS.difficulty * difficultyFactor;

  // 4. Recency penalty - avoid words seen very recently
  const timeSinceLastPractice = now - progress.lastPracticedAt;
  if (timeSinceLastPractice < RECENCY_WINDOW_MS) {
    const recencyFactor = 1 - timeSinceLastPractice / RECENCY_WINDOW_MS;
    score += WEIGHTS.recency * recencyFactor;
  }

  // 5. New word bonus
  if (lexeme.isNew && progress.timesSeen < 3) {
    score += WEIGHTS.newWord;
  }

  return score;
}

// Select the next lexemes to practice based on priority scores
export function selectNextLexemes(
  allLexemes: Lexeme[],
  progressMap: Map<string, LexemeProgress>,
  count: number = 50,
  recentlySeenWords: Set<string> = new Set()
): Lexeme[] {
  const now = Date.now();

  // Score all lexemes
  const scoredLexemes = allLexemes
    .filter((lexeme) => !recentlySeenWords.has(lexeme.text)) // Exclude recently seen
    .map((lexeme) => ({
      lexeme,
      score: scoreLexeme(lexeme, progressMap.get(lexeme.text), now),
    }))
    .sort((a, b) => b.score - a.score);

  // Take the top scored lexemes
  return scoredLexemes.slice(0, count).map((item) => item.lexeme);
}

// Get statistics about due words
export function getDueStatistics(
  allLexemes: Lexeme[],
  progressMap: Map<string, LexemeProgress>,
  now: number = Date.now()
): {
  dueNow: number;
  dueSoon: number; // Due within 24 hours
  newWords: number;
  mastered: number;
  totalWords: number;
} {
  let dueNow = 0;
  let dueSoon = 0;
  let newWords = 0;
  let mastered = 0;

  allLexemes.forEach((lexeme) => {
    const progress = progressMap.get(lexeme.text);

    if (!progress) {
      newWords++;
    } else {
      if (progress.mastered) {
        mastered++;
      }

      if (progress.nextDue <= now) {
        dueNow++;
      } else if (progress.nextDue <= now + DAY_MS) {
        dueSoon++;
      }
    }
  });

  return {
    dueNow,
    dueSoon,
    newWords,
    mastered,
    totalWords: allLexemes.length,
  };
}

// Helper to determine if a word is due
export function isDue(progress: LexemeProgress | undefined, now: number = Date.now()): boolean {
  if (!progress) return true; // New words are always "due"
  return progress.nextDue <= now;
}

// Helper to format next due time as human-readable string
export function formatNextDue(nextDue: number, now: number = Date.now()): string {
  const diff = nextDue - now;
  const absDiff = Math.abs(diff);

  if (diff < 0) {
    // Overdue
    if (absDiff < HOUR_MS) {
      const minutes = Math.floor(absDiff / (60 * 1000));
      return `${minutes}m overdue`;
    } else if (absDiff < DAY_MS) {
      const hours = Math.floor(absDiff / HOUR_MS);
      return `${hours}h overdue`;
    } else {
      const days = Math.floor(absDiff / DAY_MS);
      return `${days}d overdue`;
    }
  } else {
    // Due in future
    if (absDiff < HOUR_MS) {
      return "Due soon";
    } else if (absDiff < DAY_MS) {
      const hours = Math.floor(absDiff / HOUR_MS);
      return `Due in ${hours}h`;
    } else {
      const days = Math.floor(absDiff / DAY_MS);
      return `Due in ${days}d`;
    }
  }
}
