// Get timeout from environment variable or use default
const timeoutMs = process.env.NEXT_PUBLIC_OPENAI_TIMEOUT_MS
  ? parseInt(process.env.NEXT_PUBLIC_OPENAI_TIMEOUT_MS, 10)
  : 30000; // Increased default timeout to 30 seconds

export const OPENAI_CONFIG = {
  baseURL: "https://api.openai.com/v1/chat/completions",
  defaultModel: "gpt-4o",
  requestTimeout: timeoutMs, // ms, configurable via NEXT_PUBLIC_OPENAI_TIMEOUT_MS
  defaultTemperature: 0.7,
  defaultMaxTokens: 500,
} as const;
