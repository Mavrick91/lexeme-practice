import type { ChatMessage } from "@/types/chat";
import { OPENAI_CONFIG } from "@/config/openai";
import { HINT_CONFIG } from "@/config/hint";

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
  const timeout = options.timeout ?? OPENAI_CONFIG.defaultTimeout;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(OPENAI_CONFIG.baseURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
        temperature,
      }),
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
      throw new Error("Request timeout");
    }
    throw error;
  }
};

/**
 * Generate a contextual hint sentence for Indonesian language learning
 */
export const generateHintSentence = async (word: string): Promise<string> => {
  const messages = [
    { role: "system", content: HINT_CONFIG.systemPrompt },
    { role: "user", content: `Indonesian word: "${word}"` },
  ];
  return postChatCompletion(messages, { maxTokens: HINT_CONFIG.maxTokens });
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
