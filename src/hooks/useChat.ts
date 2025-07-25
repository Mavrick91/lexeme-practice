import { useState, useCallback } from "react";
import type { ChatMessage, ChatRole } from "@/types/chat";
import { chatCompletion } from "@/lib/openai";
import { tryCatch } from "@/lib/tryCatch";
import { toast } from "sonner";

export function useChat(initialSystemPrompt: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "system" as ChatRole,
      content: initialSystemPrompt,
      timestamp: Date.now(),
    },
  ]);
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(
    async (userContent: string) => {
      if (!userContent.trim() || isSending) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: userContent,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);

      const [response, error] = await tryCatch(() => chatCompletion([...messages, userMessage]));

      if (error) {
        console.error("Failed to get AI response:", error);
        toast.error("Failed to get AI response. Please try again.");
        setIsSending(false);
        return;
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.content,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsSending(false);
    },
    [messages, isSending]
  );

  const reset = useCallback((newSystemPrompt: string) => {
    setMessages([
      {
        id: window.crypto.randomUUID(),
        role: "system" as ChatRole,
        content: newSystemPrompt,
        timestamp: Date.now(),
      },
    ]);
    setIsSending(false);
  }, []);

  return {
    messages: messages.filter((m) => m.role !== "system"), // Don't show system messages in UI
    isSending,
    sendMessage,
    reset,
  };
}
