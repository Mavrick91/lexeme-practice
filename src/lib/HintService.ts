import type { Lexeme } from "@/types";
import type { HintData, HintCache } from "@/types/hint";
import { HINT_CONFIG } from "@/config/hint";
import { generateRelatedWords } from "./openai";

// Module-level state
let memoryCache: Map<string, HintData> = new Map();
let requestTimestamps: number[] = [];
let isLoaded = false;

// Migrate legacy hint data
const migrateLegacyHint = (hint: any): HintData | null => {
  // If it's already in the new format, return as is
  if (hint.relatedWords && Array.isArray(hint.relatedWords)) {
    return hint as HintData;
  }

  // If it's legacy format with sentence, return null to skip it
  if (hint.sentence && typeof hint.sentence === "string") {
    return null; // Legacy data, skip it
  }

  return null;
};

// Load cache from localStorage
const loadFromStorage = (): void => {
  try {
    const stored = localStorage.getItem(HINT_CONFIG.cacheKey);
    if (stored) {
      const cache: HintCache = JSON.parse(stored);
      Object.entries(cache).forEach(([key, value]) => {
        const migrated = migrateLegacyHint(value);
        if (migrated) {
          memoryCache.set(key, migrated);
        }
      });
    }
    isLoaded = true;
  } catch (error) {
    console.error("Failed to load hint cache:", error);
    isLoaded = true;
  }
};

// Save cache to localStorage
const saveToStorage = (): void => {
  try {
    const cache: HintCache = {};
    // Keep only the most recent entries
    const entries = Array.from(memoryCache.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, HINT_CONFIG.maxCacheSize);

    entries.forEach(([key, value]) => {
      cache[key] = value;
    });

    localStorage.setItem(HINT_CONFIG.cacheKey, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to save hint cache:", error);
  }
};

// Check rate limiting
const checkRateLimit = (): void => {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Remove timestamps older than 1 minute
  requestTimestamps = requestTimestamps.filter((ts) => ts > oneMinuteAgo);

  if (requestTimestamps.length >= HINT_CONFIG.maxRequestsPerMinute) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  requestTimestamps.push(now);
};

// Generate fallback hint
const generateFallbackHint = (lexeme: Lexeme): string[] => {
  // Generate generic related words based on common categories
  const genericRelatedWords: Record<string, string[]> = {
    // Common nouns
    default_noun: ["object", "thing", "item", "place", "concept"],
    // Common verbs
    default_verb: ["action", "movement", "activity", "doing", "process"],
    // Common adjectives
    default_adj: ["quality", "characteristic", "description", "property", "attribute"],
  };

  // Try to guess the word type and return appropriate fallback
  const word = lexeme.text.toLowerCase();

  // Simple heuristics for Indonesian word patterns
  if (word.startsWith("ber") || word.startsWith("me")) {
    return genericRelatedWords.default_verb;
  } else if (word.endsWith("an") || word.endsWith("nya")) {
    return genericRelatedWords.default_noun;
  } else {
    // Default fallback
    return genericRelatedWords.default_noun;
  }
};

// Ensure cache is loaded
const ensureLoaded = () => {
  if (!isLoaded) {
    loadFromStorage();
  }
};

// Main function to get hint
const getHint = async (lexeme: Lexeme): Promise<HintData> => {
  ensureLoaded();

  // Check cache first
  const cached = memoryCache.get(lexeme.text);
  if (cached) {
    return cached;
  }

  try {
    // Check rate limit
    checkRateLimit();

    // Generate hint with GPT
    const relatedWords = await generateRelatedWords(lexeme.text);

    if (!relatedWords || relatedWords.length === 0) {
      throw new Error("Invalid hint format");
    }

    const hint: HintData = {
      relatedWords,
      timestamp: Date.now(),
      source: "gpt",
    };

    // Cache the result
    memoryCache.set(lexeme.text, hint);
    saveToStorage();

    return hint;
  } catch (error) {
    console.error("Failed to generate GPT hint:", error);

    // Generate fallback
    const hint: HintData = {
      relatedWords: generateFallbackHint(lexeme),
      timestamp: Date.now(),
      source: "fallback",
    };

    // Cache even fallback hints
    memoryCache.set(lexeme.text, hint);
    saveToStorage();

    return hint;
  }
};

// Clear cache function
const clearCache = (): void => {
  memoryCache.clear();
  requestTimestamps = [];
  localStorage.removeItem(HINT_CONFIG.cacheKey);
};

// Factory function for creating hint service (useful for testing)
const createHintService = () => {
  return {
    getHint,
    clearCache,
  };
};

// Export singleton instance
export const hintService = createHintService();
