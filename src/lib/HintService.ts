import type { Lexeme } from "@/types";
import type { HintData, HintCache } from "@/types/hint";
import { HINT_CONFIG } from "@/config/hint";
import { generateHintSentence } from "./openai";

// Module-level state
let memoryCache: Map<string, HintData> = new Map();
let requestTimestamps: number[] = [];
let isLoaded = false;

// Load cache from localStorage
const loadFromStorage = (): void => {
  try {
    const stored = localStorage.getItem(HINT_CONFIG.cacheKey);
    if (stored) {
      const cache: HintCache = JSON.parse(stored);
      Object.entries(cache).forEach(([key, value]) => {
        memoryCache.set(key, value);
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
const generateFallbackHint = (lexeme: Lexeme): string => {
  const word = lexeme.text;
  const firstLetter = word[0].toUpperCase();

  // Simple Indonesian template-based fallbacks
  const templates = [
    `Kata yang dimulai dengan ${firstLetter} ini adalah ___.`,
    `Dia ___ dari universitas tahun lalu.`, // Good for "lulus" (graduated)
    `Saya ___ bahasa Indonesia.`, // Generic for verbs
    `Hari ini cuaca sangat ___.`, // Generic for adjectives
    `___ adalah kata yang penting.`, // Generic fallback
  ];

  // Pick a random template
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template;
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
    const sentence = await generateHintSentence(lexeme.text);

    if (!sentence || !sentence.includes("___")) {
      throw new Error("Invalid hint format");
    }

    const hint: HintData = {
      sentence,
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
      sentence: generateFallbackHint(lexeme),
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
