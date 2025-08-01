export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  imageUrl?: string;
  meta?: {
    templateId?: string;
    [key: string]: unknown;
  };
};

export type ChatConversation = {
  id: string; // Same as word, kept for compatibility
  word: string; // The lexeme text this conversation is about
  messages: ChatMessage[];
  lastUpdated: number;
};
