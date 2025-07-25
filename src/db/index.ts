import { openDB } from "idb";
import type { DBSchema } from "idb";
import type { LexemeProgress, UserStats } from "../types";

type LexemePracticeDB = {
  lexemeProgress: {
    key: string; // lexeme text
    value: LexemeProgress;
  };
  userStats: {
    key: "overall";
    value: UserStats;
  };
} & DBSchema;

const dbPromise = openDB<LexemePracticeDB>("lexemePractice", 1, {
  upgrade(db) {
    db.createObjectStore("lexemeProgress", { keyPath: "text" });
    db.createObjectStore("userStats");
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
