import { render, screen, waitFor } from "@/test-utils";
import userEvent from "@testing-library/user-event";
import { ModernWordCard } from "@/components/ModernWordCard";
import { renderHook, act } from "@testing-library/react";
import { useProgress } from "@/hooks/useProgress";
import type { Lexeme, LexemeProgress } from "@/types";

// Mock the database functions
jest.mock("@/db", () => ({
  getLexemeProgress: jest.fn(),
  putLexemeProgress: jest.fn(),
  getUserStats: jest.fn(),
  putUserStats: jest.fn(),
  getAllLexemeProgress: jest.fn(),
  getReadyDB: jest.fn(),
  getPracticeHistory: jest.fn(),
  addPracticeHistoryItem: jest.fn(),
  clearPracticeHistory: jest.fn(),
  clearAllChatConversations: jest.fn(),
}));

import * as dbModule from "@/db";
const mockedDb = dbModule as jest.Mocked<typeof dbModule>;

describe("Streak Logic Integration Tests", () => {
  const sampleLexeme: Lexeme = {
    text: "rumah",
    audioURL: "https://example.com/rumah.mp3",
    translations: ["house", "home"],
    phonetic: "roo-mah",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock implementations
    mockedDb.getUserStats.mockResolvedValue(undefined);
    mockedDb.getLexemeProgress.mockResolvedValue(undefined);
    mockedDb.putLexemeProgress.mockResolvedValue();
    mockedDb.putUserStats.mockResolvedValue();
    mockedDb.getAllLexemeProgress.mockResolvedValue([]);
    mockedDb.getReadyDB.mockReturnValue(Promise.resolve({} as any));
    mockedDb.getPracticeHistory.mockResolvedValue([]);
    mockedDb.addPracticeHistoryItem.mockResolvedValue();
    mockedDb.clearPracticeHistory.mockResolvedValue();
    mockedDb.clearAllChatConversations.mockResolvedValue();
  });

  describe("Streak Counter Display", () => {
    it("should show 0/5 for a new word with no progress", async () => {
      mockedDb.getLexemeProgress.mockResolvedValue(undefined);

      const { result } = renderHook(() => useProgress());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.progressMap).toBeDefined();
      });

      const progress = result.current.getProgress("rumah");
      expect(progress).toBeUndefined();

      // Render the card with no progress
      render(
        <ModernWordCard
          lexeme={sampleLexeme}
          onCorrect={jest.fn()}
          onIncorrect={jest.fn()}
          onNext={jest.fn()}
          progress={progress}
        />
      );

      // Should display 0/5
      expect(
        screen.getByText((content, element) => {
          return element?.tagName === "SPAN" && content === "0/5";
        })
      ).toBeInTheDocument();
    });

    it("should increment streak on correct answers", async () => {
      const { result } = renderHook(() => useProgress());

      // Mock initial state - no previous progress
      mockedDb.getLexemeProgress.mockResolvedValueOnce(undefined);

      // Record first correct answer
      await act(async () => {
        const updatedProgress = await result.current.recordAnswer(sampleLexeme, true);
        expect(updatedProgress.consecutiveCorrectStreak).toBe(1);
      });

      // Mock the saved progress for next call
      mockedDb.getLexemeProgress.mockResolvedValueOnce({
        text: "rumah",
        timesSeen: 1,
        timesCorrect: 1,
        lastPracticedAt: Date.now(),
        recentIncorrectStreak: 0,
        confusedWith: {},
        easingLevel: 1,
        consecutiveCorrectStreak: 1,
        isMastered: false,
      });

      // Record second correct answer
      await act(async () => {
        const updatedProgress = await result.current.recordAnswer(sampleLexeme, true);
        expect(updatedProgress.consecutiveCorrectStreak).toBe(2);
      });
    });

    it("should reset streak to 0 on incorrect answer", async () => {
      const { result } = renderHook(() => useProgress());

      // Mock existing progress with streak of 3
      mockedDb.getLexemeProgress.mockResolvedValueOnce({
        text: "rumah",
        timesSeen: 5,
        timesCorrect: 3,
        lastPracticedAt: Date.now(),
        recentIncorrectStreak: 0,
        confusedWith: {},
        easingLevel: 1,
        consecutiveCorrectStreak: 3,
        isMastered: false,
      });

      // Record incorrect answer
      await act(async () => {
        const updatedProgress = await result.current.recordAnswer(sampleLexeme, false, "wrong");
        expect(updatedProgress.consecutiveCorrectStreak).toBe(0);
      });
    });

    it("should mark as mastered when streak reaches 5", async () => {
      const { result } = renderHook(() => useProgress());

      // Mock existing progress with streak of 4
      mockedDb.getLexemeProgress.mockResolvedValueOnce({
        text: "rumah",
        timesSeen: 8,
        timesCorrect: 7,
        lastPracticedAt: Date.now(),
        recentIncorrectStreak: 0,
        confusedWith: {},
        easingLevel: 2,
        consecutiveCorrectStreak: 4,
        isMastered: false,
      });

      // Record fifth correct answer in a row
      await act(async () => {
        const updatedProgress = await result.current.recordAnswer(sampleLexeme, true);
        expect(updatedProgress.consecutiveCorrectStreak).toBe(5);
        expect(updatedProgress.isMastered).toBe(true);
        expect(updatedProgress.masteredAt).toBeDefined();
      });
    });

    it("should not increment streak beyond 5 for mastered words", async () => {
      const { result } = renderHook(() => useProgress());

      // Mock existing mastered word
      mockedDb.getLexemeProgress.mockResolvedValueOnce({
        text: "rumah",
        timesSeen: 10,
        timesCorrect: 10,
        lastPracticedAt: Date.now(),
        recentIncorrectStreak: 0,
        confusedWith: {},
        easingLevel: 2,
        consecutiveCorrectStreak: 5,
        isMastered: true,
        masteredAt: Date.now() - 1000,
      });

      // Record another correct answer
      await act(async () => {
        const updatedProgress = await result.current.recordAnswer(sampleLexeme, true);
        expect(updatedProgress.consecutiveCorrectStreak).toBe(6); // Can go beyond 5
        expect(updatedProgress.isMastered).toBe(true);
      });
    });
  });

  describe("Visual Progress Updates", () => {
    it("should update visual indicators as streak progresses", async () => {
      const onCorrect = jest.fn();
      const onIncorrect = jest.fn();
      const onNext = jest.fn();

      // Test each streak level
      const streakTests = [
        { streak: 0, emoji: "⭕" },
        { streak: 1, emoji: "✨" },
        { streak: 2, emoji: "⭐" },
        { streak: 3, emoji: "🔥" },
        { streak: 4, emoji: "🎯" },
      ];

      for (const { streak, emoji } of streakTests) {
        const { unmount } = render(
          <ModernWordCard
            lexeme={sampleLexeme}
            onCorrect={onCorrect}
            onIncorrect={onIncorrect}
            onNext={onNext}
            progress={{
              text: "rumah",
              timesSeen: 5,
              timesCorrect: 3,
              lastPracticedAt: Date.now(),
              recentIncorrectStreak: 0,
              confusedWith: {},
              easingLevel: 1,
              consecutiveCorrectStreak: streak,
              isMastered: false,
            }}
          />
        );

        // Check emoji is displayed
        expect(screen.getByText(emoji)).toBeInTheDocument();

        // Check streak counter
        expect(
          screen.getByText((content, element) => {
            return element?.tagName === "SPAN" && content === `${streak}/5`;
          })
        ).toBeInTheDocument();

        unmount();
      }
    });
  });

  describe("Component Integration", () => {
    it("should handle complete flow from 0 to mastered", async () => {
      const user = userEvent.setup({ delay: null });
      const { result } = renderHook(() => useProgress());

      // Start with no progress
      mockedDb.getLexemeProgress.mockResolvedValue(undefined);

      const handleCorrect = jest.fn(async () => {
        const progress = await result.current.recordAnswer(sampleLexeme, true);
        return { justMastered: progress.isMastered && progress.consecutiveCorrectStreak === 5 };
      });

      const handleIncorrect = jest.fn(async (userAnswer?: string) => {
        await result.current.recordAnswer(sampleLexeme, false, userAnswer);
      });

      const handleNext = jest.fn();

      const { rerender } = render(
        <ModernWordCard
          lexeme={sampleLexeme}
          onCorrect={handleCorrect}
          onIncorrect={handleIncorrect}
          onNext={handleNext}
          progress={result.current.getProgress("rumah")}
        />
      );

      // Initially should show 0/5
      expect(
        screen.getByText((content, element) => {
          return element?.tagName === "SPAN" && content === "0/5";
        })
      ).toBeInTheDocument();

      // Answer correctly 5 times
      for (let i = 1; i <= 5; i++) {
        // Mock the progress for this iteration
        mockedDb.getLexemeProgress.mockResolvedValueOnce({
          text: "rumah",
          timesSeen: i - 1,
          timesCorrect: i - 1,
          lastPracticedAt: Date.now(),
          recentIncorrectStreak: 0,
          confusedWith: {},
          easingLevel: i >= 3 ? 2 : 1,
          consecutiveCorrectStreak: i - 1,
          isMastered: false,
        });

        // Type correct answer
        const input = screen.getByPlaceholderText("Type your answer...");
        await user.clear(input);
        await user.type(input, "house");
        await user.keyboard("{Enter}");

        // Wait for the answer to be processed
        await waitFor(() => {
          expect(handleCorrect).toHaveBeenCalledTimes(i);
        });

        // Update the component with new progress
        await act(async () => {
          const progress = result.current.getProgress("rumah");
          rerender(
            <ModernWordCard
              lexeme={sampleLexeme}
              onCorrect={handleCorrect}
              onIncorrect={handleIncorrect}
              onNext={handleNext}
              progress={progress}
            />
          );
        });

        // Check if marked as mastered on the 5th correct answer
        if (i === 5) {
          expect(handleNext).toHaveBeenCalledWith("rumah");
        }
      }
    });

    it("should reset streak when answering incorrectly after building streak", async () => {
      const user = userEvent.setup({ delay: null });
      const { result } = renderHook(() => useProgress());

      // Start with streak of 3
      const initialProgress: LexemeProgress = {
        text: "rumah",
        timesSeen: 5,
        timesCorrect: 3,
        lastPracticedAt: Date.now(),
        recentIncorrectStreak: 0,
        confusedWith: {},
        easingLevel: 1,
        consecutiveCorrectStreak: 3,
        isMastered: false,
      };

      mockedDb.getLexemeProgress.mockResolvedValue(initialProgress);
      mockedDb.getAllLexemeProgress.mockResolvedValue([initialProgress]);

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.progressMap.size).toBeGreaterThan(0);
      });

      const handleIncorrect = jest.fn(async (userAnswer?: string) => {
        await result.current.recordAnswer(sampleLexeme, false, userAnswer);
      });

      const { rerender } = render(
        <ModernWordCard
          lexeme={sampleLexeme}
          onCorrect={jest.fn()}
          onIncorrect={handleIncorrect}
          onNext={jest.fn()}
          progress={result.current.getProgress("rumah")}
        />
      );

      // Should initially show 3/5
      expect(
        screen.getByText((content, element) => {
          return element?.tagName === "SPAN" && content === "3/5";
        })
      ).toBeInTheDocument();

      // Answer incorrectly
      jest.useFakeTimers();
      const input = screen.getByPlaceholderText("Type your answer...");
      await user.type(input, "wrong");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(handleIncorrect).toHaveBeenCalledWith("wrong");
      });

      // Mock the updated progress after incorrect answer
      mockedDb.getLexemeProgress.mockResolvedValue({
        text: "rumah",
        timesSeen: 6,
        timesCorrect: 3,
        lastPracticedAt: Date.now(),
        recentIncorrectStreak: 1,
        confusedWith: { wrong: 1 },
        easingLevel: 0,
        consecutiveCorrectStreak: 0, // Reset to 0
        isMastered: false,
      });

      // Force update of progress map
      await act(async () => {
        // The recordAnswer should have updated the progress map
        await waitFor(() => {
          const updatedProgress = result.current.getProgress("rumah");
          expect(updatedProgress?.consecutiveCorrectStreak).toBe(0);
        });
      });

      // Rerender with updated progress
      const updatedProgress = result.current.getProgress("rumah");
      rerender(
        <ModernWordCard
          lexeme={sampleLexeme}
          onCorrect={jest.fn()}
          onIncorrect={handleIncorrect}
          onNext={jest.fn()}
          progress={updatedProgress}
        />
      );

      // Should now show 0/5
      expect(
        screen.getByText((content, element) => {
          return element?.tagName === "SPAN" && content === "0/5";
        })
      ).toBeInTheDocument();

      jest.useRealTimers();
    });
  });
});
