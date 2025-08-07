import { OPENAI_CONFIG } from "@/config/openai";
import { HINT_CONFIG } from "@/config/hint";
import type { ChatMessage } from "@/types/chat";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

type CompletionOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
};

/**
 * Shared helper for OpenAI chat completions
 */
const postChatCompletion = async (
  messages: Array<{ role: string; content: string }>,
  options: CompletionOptions = {}
): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const model = options.model ?? OPENAI_CONFIG.defaultModel;
  const max_tokens = options.maxTokens ?? OPENAI_CONFIG.defaultMaxTokens;
  const temperature = options.temperature ?? OPENAI_CONFIG.defaultTemperature;
  const timeout = options.timeout ?? OPENAI_CONFIG.requestTimeout;

  // Create an AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(OPENAI_CONFIG.baseURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
        temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OpenAI API request timeout");
    }
    throw error;
  }
};

/**
 * Generate related words hint for Indonesian language learning
 */
export const generateRelatedWords = async (word: string): Promise<string[]> => {
  const messages = [
    { role: "system", content: HINT_CONFIG.systemPrompt },
    { role: "user", content: `Indonesian word: "${word}"` },
  ];
  const response = await postChatCompletion(messages, { maxTokens: HINT_CONFIG.maxTokens });
  // Parse the comma-separated list of words
  return response
    .split(",")
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
};

/**
 * Chat completion for AI conversations
 */
export const chatCompletion = async (
  messages: ChatMessage[],
  options: Partial<CompletionOptions> = {}
): Promise<{ content: string }> => {
  const content = await postChatCompletion(
    messages.map((m) => ({ role: m.role, content: m.content })),
    options
  );
  return { content };
};

/**
 * Generate a mnemonic image using scenario presets
 */
export const generateMnemonicImage = async (
  word: string,
  translations: string[],
  memoryTip?: string,
  scenario: "beginner" | "intermediate" | "advanced" | "kids" | "quickReview" = "beginner"
): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const { buildQuickMnemonicPrompt } = await import("./buildMnemonicPrompt");
  const prompt = buildQuickMnemonicPrompt(word, translations, scenario, memoryTip);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      size: "1024x1024",
      quality: "high",
      n: 1,
      prompt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Image API error (${response.status}): ${error}`);
  }

  const data = await response.json();

  // Handle base64 response format
  if (data.data?.[0]?.b64_json) {
    const base64Data = data.data[0].b64_json;
    const mimeType = "image/png";
    return `data:${mimeType};base64,${base64Data}`;
  }

  // Fallback to URL if available
  if (data.data?.[0]?.url) {
    return data.data[0].url;
  }

  throw new Error("No image data found in response");
};
