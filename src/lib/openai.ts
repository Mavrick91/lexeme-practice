import type { ChatMessage } from "@/types/chat";
import { OPENAI_CONFIG } from "@/config/openai";
import { HINT_CONFIG } from "@/config/hint";
import { withTimeout } from "@/lib/asyncUtils";

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

  const fetchPromise = fetch(OPENAI_CONFIG.baseURL, {
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
  }).then(async (response) => {
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }
    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || "";
  });

  return withTimeout(fetchPromise, timeout, "OpenAI API request timeout");
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
