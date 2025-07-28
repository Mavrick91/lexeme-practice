// Get timeout from environment variable or use default
const timeoutMs = import.meta.env.VITE_OPENAI_TIMEOUT_MS
  ? parseInt(import.meta.env.VITE_OPENAI_TIMEOUT_MS, 10)
  : 30000; // Increased default timeout to 30 seconds

export const OPENAI_CONFIG = {
  baseURL: "https://api.openai.com/v1/chat/completions",
  defaultModel: "gpt-4o",
  requestTimeout: timeoutMs, // ms, configurable via VITE_OPENAI_TIMEOUT_MS
  defaultTemperature: 0.7,
  defaultMaxTokens: 500,
} as const;
