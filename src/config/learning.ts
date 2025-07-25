export const LEARNING_CONFIG = {
  // Mistake scoring weight in the scheduler
  MISTAKE_WEIGHT: 1.5, // Multiplier for mistake score in selection algorithm

  // Time window for considering a mistake "recent"
  RECENT_INCORRECT_HOURS: 24, // Hours within which a mistake is considered recent

  // Streak requirements for easing level promotion
  EASING_PROMOTION_STREAK: 3, // Consecutive correct answers needed to increase easing level

  // Easing level thresholds
  EASING_THRESHOLD_ACCURACY: 0.5, // Accuracy below this drops to flashcard mode
  EASING_THRESHOLD_STREAK: 2, // Incorrect streak that triggers flashcard mode

  // Mistake pool settings
  DEFAULT_MISTAKE_POOL_SIZE: 20, // Default number of mistakes to focus on

  // Score decay factors
  RECENCY_DECAY_FACTOR: 0.95, // How much recency affects mistake scoring (per hour)
} as const;
