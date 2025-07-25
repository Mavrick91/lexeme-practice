import { useCallback, useEffect, useState } from "react";
import {
  getLexemeProgress,
  putLexemeProgress,
  getUserStats,
  putUserStats,
  getAllLexemeProgress,
} from "../db";
import type { Lexeme, LexemeProgress, UserStats } from "../types";
import { selectNextLexemes } from "../lib/scheduler";

export const useProgress = () => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [progressMap, setProgressMap] = useState<Map<string, LexemeProgress>>(new Map());

  // Load user stats and all progress on mount
  useEffect(() => {
    const loadData = async () => {
      const stats = await getUserStats();
      if (stats) setUserStats(stats);

      const allProgress = await getAllLexemeProgress();
      const map = new Map<string, LexemeProgress>();
      allProgress.forEach((p) => map.set(p.text, p));
      setProgressMap(map);
    };
    loadData();
  }, []);

  const recordAnswer = useCallback(async (lexeme: Lexeme, isCorrect: boolean) => {
    const now = Date.now();

    // Update per-lexeme progress
    const prev = await getLexemeProgress(lexeme.text);

    // Get current progress or create default
    const currentProgress: LexemeProgress = prev ?? {
      text: lexeme.text,
      timesSeen: 0,
      timesCorrect: 0,
      lastPracticedAt: now,
      mastered: false,
    };

    // Simple mastery: 3+ times correct with 80%+ accuracy
    const newTimesSeen = currentProgress.timesSeen + 1;
    const newTimesCorrect = currentProgress.timesCorrect + (isCorrect ? 1 : 0);
    const accuracy = newTimesCorrect / newTimesSeen;
    const isMastered = newTimesCorrect >= 3 && accuracy >= 0.8;

    const updated: LexemeProgress = {
      text: lexeme.text,
      timesSeen: newTimesSeen,
      timesCorrect: newTimesCorrect,
      lastPracticedAt: now,
      mastered: isMastered,
    };

    await putLexemeProgress(updated);
    setProgressMap((prev) => new Map(prev).set(lexeme.text, updated));

    // Update overall stats
    const prevStats = await getUserStats();
    const stats: UserStats = prevStats ?? {
      totalSeen: 0,
      totalCorrect: 0,
      lastPracticedAt: now,
    };

    const updatedStats: UserStats = {
      totalSeen: stats.totalSeen + 1,
      totalCorrect: stats.totalCorrect + (isCorrect ? 1 : 0),
      lastPracticedAt: now,
    };

    await putUserStats(updatedStats);
    setUserStats(updatedStats);
  }, []);

  const getProgress = useCallback(
    (text: string): LexemeProgress | undefined => {
      return progressMap.get(text);
    },
    [progressMap]
  );

  const getDueLexemes = useCallback(
    (allLexemes: Lexeme[], count: number = 50, excludeSet: Set<string> = new Set()) => {
      return selectNextLexemes(allLexemes, progressMap, count, excludeSet);
    },
    [progressMap]
  );

  return {
    recordAnswer,
    userStats,
    getProgress,
    progressMap,
    getDueLexemes,
  };
};
