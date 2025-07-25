import type { ChatMessage } from "@/types/chat";

// You'll need to set VITE_OPENAI_API_KEY in your .env.local file
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export async function chatCompletion(messages: ChatMessage[]): Promise<{ content: string }> {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your .env.local file"
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: messages.map(({ role, content }) => ({ role, content })),
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
  };
}
