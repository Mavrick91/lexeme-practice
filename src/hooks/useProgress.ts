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

  const recordAnswer = useCallback(
    async (lexeme: Lexeme, isCorrect: boolean, userAnswer?: string) => {
      const now = Date.now();

      // Update per-lexeme progress
      const prev = await getLexemeProgress(lexeme.text);

      // Get current progress or create default
      const currentProgress: LexemeProgress = prev ?? {
        text: lexeme.text,
        timesSeen: 0,
        timesCorrect: 0,
        lastPracticedAt: now,
        recentIncorrectStreak: 0,
        confusedWith: {},
        easingLevel: 1,
      };

      // Update mistake tracking
      let newStreak = currentProgress.recentIncorrectStreak || 0;
      let newConfusedWith = { ...(currentProgress.confusedWith || {}) };
      let newEasingLevel = currentProgress.easingLevel || 1;
      let lastIncorrectAt = currentProgress.lastIncorrectAt;

      if (!isCorrect) {
        newStreak++;
        lastIncorrectAt = now;

        // Track what the user confused it with
        if (userAnswer && userAnswer.trim()) {
          const normalizedAnswer = userAnswer.toLowerCase().trim();
          newConfusedWith[normalizedAnswer] = (newConfusedWith[normalizedAnswer] || 0) + 1;
        }

        // Drop to flashcard mode if struggling
        if (
          newStreak >= 2 ||
          (currentProgress.timesSeen > 0 &&
            currentProgress.timesCorrect / currentProgress.timesSeen < 0.5)
        ) {
          newEasingLevel = 0;
        }
      } else {
        // Reset streak on correct answer
        if (newStreak > 0) {
          newStreak = 0;
        }

        // Gradually increase easing level with consecutive correct answers
        const correctStreak = currentProgress.recentIncorrectStreak === 0 ? 1 : 0;
        if (correctStreak >= 3 && newEasingLevel < 2) {
          newEasingLevel = Math.min(2, newEasingLevel + 1);
        }
      }

      const newTimesSeen = currentProgress.timesSeen + 1;
      const newTimesCorrect = currentProgress.timesCorrect + (isCorrect ? 1 : 0);

      const updated: LexemeProgress = {
        text: lexeme.text,
        timesSeen: newTimesSeen,
        timesCorrect: newTimesCorrect,
        lastPracticedAt: now,
        lastIncorrectAt,
        recentIncorrectStreak: newStreak,
        confusedWith: newConfusedWith,
        easingLevel: newEasingLevel,
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
    (allLexemes: Lexeme[], count: number = 50, excludeSet: Set<string> = new Set()) => {
      return selectNextLexemes(allLexemes, progressMap, count, excludeSet);
    },
    [progressMap]
  );

  const getMistakePool = useCallback(
    (allLexemes: Lexeme[], limit: number = 20): Lexeme[] => {
      // Get lexemes that have been answered incorrectly
      const mistakeLexemes = allLexemes.filter((lexeme) => {
        const progress = progressMap.get(lexeme.text);
        return progress && progress.timesSeen > progress.timesCorrect;
      });

      // Sort by mistake severity (more mistakes = higher priority)
      return mistakeLexemes
        .sort((a, b) => {
          const progressA = progressMap.get(a.text)!;
          const progressB = progressMap.get(b.text)!;

          // Calculate mistake score
          const mistakeScoreA =
            progressA.timesSeen -
            progressA.timesCorrect +
            progressA.recentIncorrectStreak * 2 +
            (progressA.lastIncorrectAt
              ? (Date.now() - progressA.lastIncorrectAt) / (1000 * 60 * 60)
              : 0);
          const mistakeScoreB =
            progressB.timesSeen -
            progressB.timesCorrect +
            progressB.recentIncorrectStreak * 2 +
            (progressB.lastIncorrectAt
              ? (Date.now() - progressB.lastIncorrectAt) / (1000 * 60 * 60)
              : 0);

          return mistakeScoreB - mistakeScoreA; // Higher score first
        })
        .slice(0, limit);
    },
    [progressMap]
  );

  return {
    recordAnswer,
    userStats,
    getProgress,
    progressMap,
    getDueLexemes,
    getMistakePool,
  };
};
