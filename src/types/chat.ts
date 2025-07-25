export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
};

export type ChatConversation = {
  id: string; // Same as PracticeHistoryItem id
  historyItemId: string; // Reference to PracticeHistoryItem
  messages: ChatMessage[];
  lastUpdated: number;
};
