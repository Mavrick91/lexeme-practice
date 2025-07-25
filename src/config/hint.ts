export const HINT_CONFIG = {
  // Cache settings
  maxCacheSize: 500,
  cacheKey: "cshs-hints",

  // Request settings
  maxRequestsPerMinute: 20,

  // Hint-specific settings
  maxTokens: 60, // Shorter than default for concise hints
  systemPrompt: `You are a language learning assistant helping English speakers learn Indonesian. Generate a list of 3-5 related English words that are semantically connected to the given Indonesian word's English translation(s). The words should help the learner think of the correct translation without giving it away directly. Return only a comma-separated list of English words. Example: for "rumah" (house), you might return: "building, family, shelter, rooms, door"`,
} as const;
