import { useState, useCallback, useEffect } from "react";
import type { ChatMessage, ChatRole, ChatConversation } from "@/types/chat";
import { chatCompletion } from "@/lib/openai";
import { tryCatch } from "@/lib/tryCatch";
import { toast } from "sonner";
import { getChatConversation, saveChatConversation } from "@/db";

export function useChat(initialSystemPrompt: string, historyItemId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "system" as ChatRole,
      content: initialSystemPrompt,
      timestamp: Date.now(),
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing conversation on mount
  useEffect(() => {
    const loadConversation = async () => {
      if (!historyItemId) {
        setIsLoading(false);
        return;
      }

      const [conversation, error] = await tryCatch(() => getChatConversation(historyItemId));

      if (error) {
        console.error("Failed to load conversation:", error);
        setIsLoading(false);
        return;
      }

      if (conversation && conversation.messages.length > 0) {
        setMessages(conversation.messages);
      }

      setIsLoading(false);
    };

    loadConversation();
  }, [historyItemId]);

  // Save conversation after each message update
  useEffect(() => {
    const saveConversation = async () => {
      if (!historyItemId || messages.length <= 1 || isLoading) return; // Don't save if only system message

      const conversation: ChatConversation = {
        id: historyItemId,
        historyItemId,
        messages,
        lastUpdated: Date.now(),
      };

      const [, error] = await tryCatch(() => saveChatConversation(conversation));

      if (error) {
        console.error("Failed to save conversation:", error);
      }
    };

    saveConversation();
  }, [messages, historyItemId, isLoading]);

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
    isLoading,
    sendMessage,
    reset,
  };
}
