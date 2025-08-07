import { useCallback, useEffect, useState } from "react";
import {
  getLexemeProgress,
  putLexemeProgress,
  getUserStats,
  putUserStats,
  getAllLexemeProgress,
} from "../db";
import type { Lexeme, LexemeProgress, UserStats } from "../types";

// Constants
const MASTERY_THRESHOLD = 5;
const MAX_EASING_LEVEL = 2;
const STRUGGLE_THRESHOLD = 2;
const MIN_SUCCESS_RATE = 0.5;

// Helper functions
const createDefaultProgress = (text: string, timestamp: number): LexemeProgress => ({
  text,
  timesSeen: 0,
  timesCorrect: 0,
  lastPracticedAt: timestamp,
  recentIncorrectStreak: 0,
  confusedWith: {},
  easingLevel: 1,
  consecutiveCorrectStreak: 0,
  isMastered: false,
});

const createMasteredProgress = (text: string, timestamp: number): LexemeProgress => ({
  ...createDefaultProgress(text, timestamp),
  easingLevel: MAX_EASING_LEVEL,
  consecutiveCorrectStreak: MASTERY_THRESHOLD,
  isMastered: true,
  masteredAt: timestamp,
});

const isStruggling = (progress: LexemeProgress): boolean => {
  const successRate = progress.timesSeen > 0 ? progress.timesCorrect / progress.timesSeen : 1;
  return progress.recentIncorrectStreak >= STRUGGLE_THRESHOLD || successRate < MIN_SUCCESS_RATE;
};

export const useProgress = () => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [progressMap, setProgressMap] = useState<Map<string, LexemeProgress>>(new Map());

  // Load user stats and all progress on mount
  useEffect(() => {
    const loadData = async () => {
      const [stats, allProgress] = await Promise.all([getUserStats(), getAllLexemeProgress()]);

      if (stats) setUserStats(stats);
      setProgressMap(new Map(allProgress.map((p) => [p.text, p])));
    };
    loadData();
  }, []);

  const updateProgressMap = useCallback((lexeme: Lexeme, progress: LexemeProgress) => {
    setProgressMap((prev) => new Map(prev).set(lexeme.text, progress));
  }, []);

  const markAsMastered = useCallback(
    async (lexeme: Lexeme): Promise<void> => {
      const now = Date.now();
      const current = await getLexemeProgress(lexeme.text);

      const updated: LexemeProgress = current
        ? {
            ...current,
            consecutiveCorrectStreak: MASTERY_THRESHOLD,
            isMastered: true,
            masteredAt: current.masteredAt || now,
            easingLevel: MAX_EASING_LEVEL,
            recentIncorrectStreak: 0,
          }
        : createMasteredProgress(lexeme.text, now);

      await putLexemeProgress(updated);
      updateProgressMap(lexeme, updated);
    },
    [updateProgressMap]
  );

  const recordAnswer = useCallback(
    async (lexeme: Lexeme, isCorrect: boolean, userAnswer?: string): Promise<LexemeProgress> => {
      const now = Date.now();
      const prev = await getLexemeProgress(lexeme.text);
      const current = prev ?? createDefaultProgress(lexeme.text, now);

      // Calculate new progress values
      const updated = isCorrect
        ? handleCorrectAnswer(current, now)
        : handleIncorrectAnswer(current, now, userAnswer);

      // Save progress
      await putLexemeProgress(updated);
      updateProgressMap(lexeme, updated);

      // Update overall stats
      await updateUserStats(isCorrect, now);

      return updated;
    },
    [updateProgressMap]
  );

  const handleCorrectAnswer = (progress: LexemeProgress, timestamp: number): LexemeProgress => {
    const correctStreak = progress.consecutiveCorrectStreak + 1;
    const isMastered = correctStreak >= MASTERY_THRESHOLD;
    const easingLevel =
      correctStreak >= 3
        ? Math.min(MAX_EASING_LEVEL, progress.easingLevel + 1)
        : progress.easingLevel;

    return {
      ...progress,
      timesSeen: progress.timesSeen + 1,
      timesCorrect: progress.timesCorrect + 1,
      lastPracticedAt: timestamp,
      recentIncorrectStreak: 0,
      easingLevel,
      consecutiveCorrectStreak: correctStreak,
      isMastered,
      masteredAt: isMastered && !progress.isMastered ? timestamp : progress.masteredAt,
    };
  };

  const handleIncorrectAnswer = (
    progress: LexemeProgress,
    timestamp: number,
    userAnswer?: string
  ): LexemeProgress => {
    const incorrectStreak = progress.recentIncorrectStreak + 1;
    const confusedWith = { ...progress.confusedWith };

    if (userAnswer?.trim()) {
      const normalized = userAnswer.toLowerCase().trim();
      confusedWith[normalized] = (confusedWith[normalized] || 0) + 1;
    }

    const updatedProgress = {
      ...progress,
      timesSeen: progress.timesSeen + 1,
      recentIncorrectStreak: incorrectStreak,
    };

    return {
      ...progress,
      timesSeen: progress.timesSeen + 1,
      lastPracticedAt: timestamp,
      lastIncorrectAt: timestamp,
      recentIncorrectStreak: incorrectStreak,
      confusedWith,
      easingLevel: isStruggling(updatedProgress) ? 0 : progress.easingLevel,
      consecutiveCorrectStreak: 0,
    };
  };

  const updateUserStats = async (isCorrect: boolean, timestamp: number) => {
    const stats = await getUserStats();
    const updatedStats: UserStats = {
      totalSeen: (stats?.totalSeen || 0) + 1,
      totalCorrect: (stats?.totalCorrect || 0) + (isCorrect ? 1 : 0),
      lastPracticedAt: timestamp,
    };
    await putUserStats(updatedStats);
    setUserStats(updatedStats);
  };

  const getProgress = useCallback(
    (text: string): LexemeProgress | undefined => progressMap.get(text),
    [progressMap]
  );

  return {
    recordAnswer,
    markAsMastered,
    userStats,
    getProgress,
    progressMap,
  };
};
