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

const dbPromise = openDB<LexemePracticeDB>("lexemePractice", 5, {
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
    if (oldVersion < 5) {
      // Migrate existing progress records to include mistake tracking fields
      const tx = db.transaction("lexemeProgress", "readwrite");
      const store = tx.objectStore("lexemeProgress");

      store.openCursor().then(function processCursor(cursor): Promise<void> | void {
        if (!cursor) return;

        const progress = cursor.value;
        // Add new fields with default values
        const updatedProgress = {
          ...progress,
          recentIncorrectStreak: progress.recentIncorrectStreak || 0,
          confusedWith: progress.confusedWith || {},
          easingLevel: progress.easingLevel || 1,
        };

        cursor.update(updatedProgress);
        return cursor.continue().then(processCursor);
      });
    }
  },
});

export const getLexemeProgress = async (text: string): Promise<LexemeProgress | undefined> => {
  return (await dbPromise).get("lexemeProgress", text);
};

export const putLexemeProgress = async (record: LexemeProgress): Promise<void> => {
  await (await dbPromise).put("lexemeProgress", record);
};

export const getAllLexemeProgress = async (): Promise<LexemeProgress[]> => {
  return (await dbPromise).getAll("lexemeProgress");
};

export const getUserStats = async (): Promise<UserStats | undefined> => {
  return (await dbPromise).get("userStats", "overall");
};

export const putUserStats = async (stats: UserStats): Promise<void> => {
  await (await dbPromise).put("userStats", stats, "overall");
};

// Practice History functions
export const getPracticeHistory = async (limit = 100): Promise<PracticeHistoryItem[]> => {
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
};

export const addPracticeHistoryItem = async (item: PracticeHistoryItem): Promise<void> => {
  await (await dbPromise).add("practiceHistory", item);
};

export const clearPracticeHistory = async (): Promise<void> => {
  const db = await dbPromise;
  const tx = db.transaction("practiceHistory", "readwrite");
  await tx.store.clear();
};

// Chat Conversation functions
export const getChatConversation = async (
  historyItemId: string
): Promise<ChatConversation | undefined> => {
  return (await dbPromise).get("chatConversations", historyItemId);
};

export const saveChatConversation = async (conversation: ChatConversation): Promise<void> => {
  await (await dbPromise).put("chatConversations", conversation);
};

export const clearAllChatConversations = async (): Promise<void> => {
  const db = await dbPromise;
  const tx = db.transaction("chatConversations", "readwrite");
  await tx.store.clear();
};
