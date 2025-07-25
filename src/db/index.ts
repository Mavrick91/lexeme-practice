import { openDB } from "idb";
import type { DBSchema } from "idb";
import type { LexemeProgress, UserStats, PracticeHistoryItem } from "../types";
import type { ChatConversation } from "../types/chat";

type LexemePracticeDB = {
  lexemeProgress: {
    key: string; // lexeme text
    value: LexemeProgress;
  };
  userStats: {
    key: "overall";
    value: UserStats;
  };
  practiceHistory: {
    key: string; // id
    value: PracticeHistoryItem;
    indexes: { "by-timestamp": number };
  };
  chatConversations: {
    key: string; // historyItemId
    value: ChatConversation;
    indexes: { "by-lastUpdated": number };
  };
} & DBSchema;

const dbPromise = openDB<LexemePracticeDB>("lexemePractice", 4, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      db.createObjectStore("lexemeProgress", { keyPath: "text" });
      db.createObjectStore("userStats");
    }
    if (oldVersion < 2) {
      const historyStore = db.createObjectStore("practiceHistory", { keyPath: "id" });
      historyStore.createIndex("by-timestamp", "timestamp");
    }
    if (oldVersion < 3) {
      const chatStore = db.createObjectStore("chatConversations", { keyPath: "historyItemId" });
      chatStore.createIndex("by-lastUpdated", "lastUpdated");
    }
    if (oldVersion < 4) {
      // SM-2 fields migration happens automatically on first access due to default values in the code
      // No explicit migration needed here
    }
  },
});

export async function getLexemeProgress(text: string): Promise<LexemeProgress | undefined> {
  return (await dbPromise).get("lexemeProgress", text);
}

export async function putLexemeProgress(record: LexemeProgress): Promise<void> {
  await (await dbPromise).put("lexemeProgress", record);
}

export async function getAllLexemeProgress(): Promise<LexemeProgress[]> {
  return (await dbPromise).getAll("lexemeProgress");
}

export async function getUserStats(): Promise<UserStats | undefined> {
  return (await dbPromise).get("userStats", "overall");
}

export async function putUserStats(stats: UserStats): Promise<void> {
  await (await dbPromise).put("userStats", stats, "overall");
}

// Practice History functions
export async function getPracticeHistory(limit = 100): Promise<PracticeHistoryItem[]> {
  const db = await dbPromise;
  const tx = db.transaction("practiceHistory", "readonly");
  const index = tx.store.index("by-timestamp");

  // Get all items sorted by timestamp (newest first)
  const items = [];
  let cursor = await index.openCursor(null, "prev");

  while (cursor && items.length < limit) {
    items.push(cursor.value);
    cursor = await cursor.continue();
  }

  return items;
}

export async function addPracticeHistoryItem(item: PracticeHistoryItem): Promise<void> {
  await (await dbPromise).add("practiceHistory", item);
}

export async function clearPracticeHistory(): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction("practiceHistory", "readwrite");
  await tx.store.clear();
}

// Chat Conversation functions
export async function getChatConversation(
  historyItemId: string
): Promise<ChatConversation | undefined> {
  return (await dbPromise).get("chatConversations", historyItemId);
}

export async function saveChatConversation(conversation: ChatConversation): Promise<void> {
  await (await dbPromise).put("chatConversations", conversation);
}

export async function deleteChatConversation(historyItemId: string): Promise<void> {
  await (await dbPromise).delete("chatConversations", historyItemId);
}

export async function clearAllChatConversations(): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction("chatConversations", "readwrite");
  await tx.store.clear();
}
