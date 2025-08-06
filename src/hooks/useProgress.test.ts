import { renderHook, act, waitFor } from "@testing-library/react";
import { useProgress } from "./useProgress";
import * as db from "@/db";
import type { Lexeme, LexemeProgress } from "@/types";

// Mock the database functions
jest.mock("@/db", () => ({
  getAllLexemeProgress: jest.fn(),
  getUserStats: jest.fn(),
  getLexemeProgress: jest.fn(),
  putLexemeProgress: jest.fn(),
  putUserStats: jest.fn(),
}));

// Mock the scheduler
jest.mock("@/lib/scheduler", () => ({
  selectNextLexemes: jest.fn((lexemes, progressMap, count) => {
    // Filter out mastered words
    const nonMastered = lexemes.filter((lexeme: any) => !progressMap.get(lexeme.text)?.isMastered);
    return nonMastered.slice(0, count);
  }),
}));

const mockedDb = db as jest.Mocked<typeof db>;

describe("useProgress", () => {
  const mockLexeme: Lexeme = {
    text: "rumah",
    translations: ["house", "home"],
    audioURL: "https://example.com/rumah.mp3",
  };

  const mockLexeme2: Lexeme = {
    text: "buku",
    translations: ["book"],
    audioURL: "https://example.com/buku.mp3",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedDb.getAllLexemeProgress.mockResolvedValue([]);
    mockedDb.getUserStats.mockResolvedValue(null);
    mockedDb.getLexemeProgress.mockResolvedValue(undefined);
    mockedDb.putLexemeProgress.mockResolvedValue(undefined);
    mockedDb.putUserStats.mockResolvedValue(undefined);
  });

  describe("Mastery tracking", () => {
    it("should track consecutive correct answers", async () => {
      const { result } = renderHook(() => useProgress());

      // Answer correctly 3 times
      for (let i = 1; i <= 3; i++) {
        await act(async () => {
          await result.current.recordAnswer(mockLexeme, true);
        });

        await waitFor(() => {
          const progress = result.current.getProgress(mockLexeme.text);
          expect(progress?.consecutiveCorrectStreak).toBe(i);
          expect(progress?.isMastered).toBe(false);
        });
      }
    });

    it("should mark word as mastered after 5 consecutive correct answers", async () => {
      const { result } = renderHook(() => useProgress());

      // Answer correctly 5 times
      for (let i = 1; i <= 5; i++) {
        await act(async () => {
          await result.current.recordAnswer(mockLexeme, true);
        });
      }

      await waitFor(() => {
        const progress = result.current.getProgress(mockLexeme.text);
        expect(progress?.consecutiveCorrectStreak).toBe(5);
        expect(progress?.isMastered).toBe(true);
        expect(progress?.masteredAt).toBeDefined();
      });
    });

    it("should reset consecutive streak on incorrect answer", async () => {
      const { result } = renderHook(() => useProgress());

      // Answer correctly 3 times
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await result.current.recordAnswer(mockLexeme, true);
        });
      }

      // Verify streak is 3
      await waitFor(() => {
        const progress = result.current.getProgress(mockLexeme.text);
        expect(progress?.consecutiveCorrectStreak).toBe(3);
      });

      // Answer incorrectly
      await act(async () => {
        await result.current.recordAnswer(mockLexeme, false, "wrong");
      });

      // Verify streak is reset
      await waitFor(() => {
        const progress = result.current.getProgress(mockLexeme.text);
        expect(progress?.consecutiveCorrectStreak).toBe(0);
        expect(progress?.isMastered).toBe(false);
      });
    });

    it("should maintain mastered status even after incorrect answer", async () => {
      const { result } = renderHook(() => useProgress());

      // Answer correctly 5 times to master
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await result.current.recordAnswer(mockLexeme, true);
        });
      }

      // Verify mastered
      await waitFor(() => {
        const progress = result.current.getProgress(mockLexeme.text);
        expect(progress?.isMastered).toBe(true);
      });

      // Answer incorrectly
      await act(async () => {
        await result.current.recordAnswer(mockLexeme, false);
      });

      // Should still be mastered but streak reset
      await waitFor(() => {
        const progress = result.current.getProgress(mockLexeme.text);
        expect(progress?.consecutiveCorrectStreak).toBe(0);
        expect(progress?.isMastered).toBe(true); // Still mastered
        expect(progress?.masteredAt).toBeDefined(); // Mastered timestamp unchanged
      });
    });

    it("should filter mastered words from mistake pool", async () => {
      const { result } = renderHook(() => useProgress());

      // Set up two words with mistakes
      await act(async () => {
        await result.current.recordAnswer(mockLexeme, false);
        await result.current.recordAnswer(mockLexeme2, false);
      });

      // Verify both are in mistake pool
      let mistakePool = result.current.getMistakePool([mockLexeme, mockLexeme2]);
      expect(mistakePool).toHaveLength(2);

      // Master the first word
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await result.current.recordAnswer(mockLexeme, true);
        });
      }

      // Verify only non-mastered word is in mistake pool
      await waitFor(() => {
        mistakePool = result.current.getMistakePool([mockLexeme, mockLexeme2]);
        expect(mistakePool).toHaveLength(1);
        expect(mistakePool[0].text).toBe("buku");
      });
    });

    it("should load existing mastery data from database", async () => {
      const existingProgress: LexemeProgress = {
        text: "rumah",
        timesSeen: 10,
        timesCorrect: 8,
        lastPracticedAt: Date.now(),
        recentIncorrectStreak: 0,
        confusedWith: {},
        easingLevel: 2,
        consecutiveCorrectStreak: 5,
        isMastered: true,
        masteredAt: Date.now() - 1000000,
      };

      mockedDb.getAllLexemeProgress.mockResolvedValue([existingProgress]);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        const progress = result.current.getProgress("rumah");
        expect(progress?.isMastered).toBe(true);
        expect(progress?.consecutiveCorrectStreak).toBe(5);
        expect(progress?.masteredAt).toBe(existingProgress.masteredAt);
      });
    });

    it("should handle mastery for words with no prior progress", async () => {
      const { result } = renderHook(() => useProgress());

      // Answer correctly 5 times for a new word
      for (let i = 1; i <= 5; i++) {
        await act(async () => {
          await result.current.recordAnswer(mockLexeme, true);
        });

        await waitFor(() => {
          const progress = result.current.getProgress(mockLexeme.text);
          expect(progress?.consecutiveCorrectStreak).toBe(i);
          expect(progress?.isMastered).toBe(i >= 5);
        });
      }
    });
  });

  describe("getDueLexemes with mastery", () => {
    it("should exclude mastered words from due lexemes", async () => {
      const masteredProgress: LexemeProgress = {
        text: "rumah",
        timesSeen: 10,
        timesCorrect: 10,
        lastPracticedAt: Date.now(),
        recentIncorrectStreak: 0,
        confusedWith: {},
        easingLevel: 2,
        consecutiveCorrectStreak: 5,
        isMastered: true,
        masteredAt: Date.now(),
      };

      mockedDb.getAllLexemeProgress.mockResolvedValue([masteredProgress]);

      const { result } = renderHook(() => useProgress());

      await waitFor(() => {
        const dueLexemes = result.current.getDueLexemes([mockLexeme, mockLexeme2], 10);
        expect(dueLexemes).toHaveLength(1);
        expect(dueLexemes[0].text).toBe("buku");
      });
    });
  });
});
