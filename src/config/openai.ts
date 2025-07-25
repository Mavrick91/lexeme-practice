export const OPENAI_CONFIG = {
  baseURL: "https://api.openai.com/v1/chat/completions",
  defaultModel: "gpt-4o",
  defaultTimeout: 8000, // ms
  defaultTemperature: 0.7,
  defaultMaxTokens: 500,
} as const;
