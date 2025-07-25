export const HINT_CONFIG = {
  // Cache settings
  maxCacheSize: 500,
  cacheKey: "cshs-hints",

  // Request settings
  maxRequestsPerMinute: 20,

  // Hint-specific settings
  maxTokens: 60, // Shorter than default for concise hints
  systemPrompt: `You are a language learning assistant helping English speakers learn Indonesian. Generate a single Indonesian sentence (under 25 words) with a blank (___) where the given Indonesian word would naturally fit. The sentence should provide context clues about how the word is used. Make the sentence simple enough for beginners. Do not use synonyms or English translations. Return only the Indonesian sentence.`,
} as const;
