import { useCallback, useEffect, useState } from "react";
import {
  getLexemeProgress,
  putLexemeProgress,
  getUserStats,
  putUserStats,
  getAllLexemeProgress,
} from "../db";
import type { Lexeme, LexemeProgress, UserStats } from "../types";
import {
  calculateQuality,
  updateEasinessFactor,
  calculateNextInterval,
  selectNextLexemes,
  getDueStatistics,
} from "../lib/scheduler";

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

  const recordAnswer = useCallback(
    async (lexeme: Lexeme, isCorrect: boolean, responseTimeMs?: number) => {
      const now = Date.now();

      // Update per-lexeme progress
      const prev = await getLexemeProgress(lexeme.text);

      // Calculate quality score for SM-2 algorithm
      const quality = calculateQuality(isCorrect, responseTimeMs);

      // Get current progress or create default
      const currentProgress: LexemeProgress = prev ?? {
        text: lexeme.text,
        timesSeen: 0,
        timesCorrect: 0,
        lastPracticedAt: now,
        mastered: false,
        easinessFactor: 2.5,
        intervalDays: 0,
        nextDue: now,
        consecutiveCorrect: 0,
      };

      // Update SM-2 fields
      const newEasinessFactor = updateEasinessFactor(currentProgress.easinessFactor, quality);
      const newInterval = calculateNextInterval(
        quality,
        currentProgress.intervalDays,
        newEasinessFactor
      );
      const newConsecutiveCorrect = isCorrect ? currentProgress.consecutiveCorrect + 1 : 0;

      // Calculate next due date
      const nextDue = now + newInterval * 24 * 60 * 60 * 1000;

      // Determine if word is mastered (3+ consecutive correct with EF > 2.0)
      const isMastered = newConsecutiveCorrect >= 3 && newEasinessFactor > 2.0;

      const updated: LexemeProgress = {
        ...currentProgress,
        timesSeen: currentProgress.timesSeen + 1,
        timesCorrect: currentProgress.timesCorrect + (isCorrect ? 1 : 0),
        lastPracticedAt: now,
        mastered: isMastered,
        easinessFactor: newEasinessFactor,
        intervalDays: newInterval,
        nextDue: nextDue,
        consecutiveCorrect: newConsecutiveCorrect,
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
    },
    []
  );

  const getProgress = useCallback(
    (text: string): LexemeProgress | undefined => {
      return progressMap.get(text);
    },
    [progressMap]
  );

  const getDueLexemes = useCallback(
    (allLexemes: Lexeme[], count: number = 50, recentlySeenWords?: Set<string>) => {
      return selectNextLexemes(allLexemes, progressMap, count, recentlySeenWords);
    },
    [progressMap]
  );

  const getStatistics = useCallback(
    (allLexemes: Lexeme[]) => {
      return getDueStatistics(allLexemes, progressMap);
    },
    [progressMap]
  );

  return {
    recordAnswer,
    userStats,
    getProgress,
    progressMap,
    getDueLexemes,
    getStatistics,
  };
};
