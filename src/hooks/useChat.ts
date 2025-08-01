import { useState, useCallback, useEffect } from "react";
import type { ChatMessage, ChatRole, ChatConversation } from "@/types/chat";
import { chatCompletion } from "@/lib/openai";
import { tryCatch } from "@/lib/tryCatch";
import { toast } from "sonner";
import { getChatConversation, saveChatConversation } from "@/db";

export const useChat = (initialSystemPrompt: string, word?: string) => {
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
      if (!word) {
        setIsLoading(false);
        return;
      }

      const [conversation, error] = await tryCatch(() => getChatConversation(word));

      if (error) {
        console.error("Failed to load conversation:", error);
        setIsLoading(false);
        return;
      }

      if (conversation && conversation.messages.length > 0) {
        setMessages((prev) => {
          // Only update if we haven't received new messages since loading started
          // This prevents overwriting new messages with old conversation data
          if (prev.length <= 1) {
            return conversation.messages;
          }
          // If we already have messages beyond the system message, don't overwrite
          console.warn("Skipping conversation load - newer messages already present");
          return prev;
        });
      }

      setIsLoading(false);
    };

    loadConversation();
  }, [word]);

  // Save conversation after each message update
  useEffect(() => {
    const saveConversation = async () => {
      // Don't save if only system message or still loading initial conversation
      if (!word || messages.length <= 1 || isLoading) return;

      const conversation: ChatConversation = {
        id: word,
        word,
        messages,
        lastUpdated: Date.now(),
      };

      const [, error] = await tryCatch(() => saveChatConversation(conversation));

      if (error) {
        console.error("Failed to save conversation:", error);
      }
    };

    saveConversation();
  }, [messages, word, isLoading]);

  const sendMessage = useCallback(
    async (userContent: string, meta?: ChatMessage["meta"]) => {
      if (!userContent.trim() || isSending) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: userContent,
        timestamp: Date.now(),
        meta,
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

  const addAssistantMessage = useCallback((content: string, imageUrl?: string) => {
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      timestamp: Date.now(),
      imageUrl,
    };
    setMessages((prev) => [...prev, assistantMessage]);
  }, []);

  return {
    messages: messages.filter((m) => m.role !== "system"), // Don't show system messages in UI
    isSending,
    isLoading,
    sendMessage,
    reset,
    addAssistantMessage,
  };
};
