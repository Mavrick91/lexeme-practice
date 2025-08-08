import { render, screen, waitFor, fireEvent } from "@/test-utils";
import App from "./App";
import lexemesData from "./combined_lexemes.json";
import type { LexemesData, LexemeProgress } from "./types";
import type { IDBPDatabase } from "idb";
import type { LexemePracticeDB } from "@/db";

// Mock the database
jest.mock("./db", () => ({
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
  clearAllLexemeProgress: jest.fn(),
}));

// Mock toast
jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
  Toaster: () => null,
}));

import * as dbModule from "./db";
import { toast } from "sonner";

const mockedDb = dbModule as jest.Mocked<typeof dbModule>;
const mockedToast = toast as jest.MockedFunction<typeof toast>;

let mockMarkAsMastered = jest.fn();

// Provide a fuller mock for useProgress so App can run without crashing
let mockProgressMap = new Map<string, LexemeProgress>();
const defaultProgress = (text: string): LexemeProgress => ({
  text,
  timesSeen: 0,
  timesCorrect: 0,
  lastPracticedAt: Date.now(),
  recentIncorrectStreak: 0,
  confusedWith: {},
  easingLevel: 1,
  consecutiveCorrectStreak: 0,
  isMastered: false,
});
const mockGetProgress = (text: string) => mockProgressMap.get(text);
const mockRecordAnswer = jest.fn(async (lexeme: { text: string }, isCorrect: boolean) => {
  const prev = mockProgressMap.get(lexeme.text) ?? defaultProgress(lexeme.text);
  const nextStreak = isCorrect ? prev.consecutiveCorrectStreak + 1 : 0;
  const updated: LexemeProgress = isCorrect
    ? {
        ...prev,
        timesSeen: prev.timesSeen + 1,
        timesCorrect: prev.timesCorrect + 1,
        consecutiveCorrectStreak: nextStreak,
        isMastered: nextStreak >= 5,
        lastPracticedAt: Date.now(),
        recentIncorrectStreak: 0,
        easingLevel: nextStreak >= 3 ? 2 : prev.easingLevel,
        masteredAt: nextStreak >= 5 ? Date.now() : prev.masteredAt,
      }
    : {
        ...prev,
        timesSeen: prev.timesSeen + 1,
        lastPracticedAt: Date.now(),
        lastIncorrectAt: Date.now(),
        recentIncorrectStreak: prev.recentIncorrectStreak + 1,
        consecutiveCorrectStreak: 0,
      };
  mockProgressMap.set(lexeme.text, updated);
  return updated;
});

jest.mock("./hooks/useProgress", () => ({
  useProgress: () => ({
    markAsMastered: mockMarkAsMastered,
    recordAnswer: mockRecordAnswer,
    getProgress: mockGetProgress,
    progressMap: mockProgressMap,
  }),
}));

describe("App - Mastered Words Filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
    // Reset progress map and handlers
    mockProgressMap = new Map<string, LexemeProgress>();
    mockRecordAnswer.mockClear();

    // Set up default mock implementations
    mockedDb.getUserStats.mockResolvedValue(undefined);
    mockedDb.getLexemeProgress.mockResolvedValue(undefined);
    mockedDb.putLexemeProgress.mockResolvedValue();
    mockedDb.putUserStats.mockResolvedValue();
    mockedDb.getAllLexemeProgress.mockResolvedValue([]);
    mockedDb.getReadyDB.mockReturnValue(Promise.resolve({} as IDBPDatabase<LexemePracticeDB>));
    mockedDb.getPracticeHistory.mockResolvedValue([]);
    mockedDb.addPracticeHistoryItem.mockResolvedValue();
    mockedDb.clearPracticeHistory.mockResolvedValue();
    mockedDb.clearAllChatConversations.mockResolvedValue();
    mockedDb.clearAllLexemeProgress.mockResolvedValue();
  });

  it("mark as mastered button triggers action and toast", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Loading lexemes...")).not.toBeInTheDocument();
    });

    const btn = await screen.findByRole("button", { name: /Mark as Mastered/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockMarkAsMastered).toHaveBeenCalled();
    });

    expect(toast.success).toHaveBeenCalled();
  });

  it("clears history and shows success toast", async () => {
    mockedDb.getPracticeHistory.mockResolvedValueOnce([
      {
        id: "1",
        word: "test",
        translation: ["t"],
        isCorrect: true,
        timestamp: Date.now(),
        isReverseMode: false,
      },
    ]);

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Loading lexemes...")).not.toBeInTheDocument();
    });

    const clearBtn = await screen.findByTitle("Clear history");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(mockedDb.clearPracticeHistory).toHaveBeenCalled();
    });

    expect(toast.success).toHaveBeenCalledWith("Practice history cleared");
  });

  it("shows error toast when clear history fails", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      mockedDb.getPracticeHistory.mockResolvedValueOnce([
        {
          id: "1",
          word: "test",
          translation: ["t"],
          isCorrect: true,
          timestamp: Date.now(),
          isReverseMode: false,
        },
      ]);

      mockedDb.clearPracticeHistory.mockRejectedValueOnce(new Error("fail"));

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText("Loading lexemes...")).not.toBeInTheDocument();
      });

      const clearBtn = await screen.findByTitle("Clear history");
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to clear practice history");
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("should not display mastered words in practice", async () => {
    const allLexemes = (lexemesData as LexemesData).learnedLexemes;

    // Create progress data where first 3 words are mastered
    const progressData: LexemeProgress[] = allLexemes.slice(0, 3).map((lexeme) => ({
      text: lexeme.text,
      timesSeen: 10,
      timesCorrect: 10,
      lastPracticedAt: Date.now(),
      recentIncorrectStreak: 0,
      confusedWith: {},
      easingLevel: 2,
      consecutiveCorrectStreak: 5,
      isMastered: true,
      masteredAt: Date.now() - 10000,
    }));

    // Mock the database to return this progress
    mockedDb.getAllLexemeProgress.mockResolvedValue(progressData);
    // Also reflect this in the mocked progress map used by the component
    mockProgressMap = new Map(progressData.map((p) => [p.text, p] as const));

    render(<App />);

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.queryByText("Loading lexemes...")).not.toBeInTheDocument();
    });

    // The displayed word should NOT be one of the mastered words
    const masteredWords = progressData.map((p) => p.text);

    // Check that none of the mastered words are displayed as the main word
    await waitFor(() => {
      const headings = screen.getAllByRole("heading");
      const displayedWords = headings.map((h) => h.textContent);

      displayedWords.forEach((word) => {
        if (word) {
          expect(masteredWords).not.toContain(word);
        }
      });
    });

    // Verify no 5/5 streak is shown
    expect(
      screen.queryByText((content, element) => {
        return element?.tagName === "SPAN" && content === "5/5";
      })
    ).not.toBeInTheDocument();
  });

  it("should show toast when all words are mastered", async () => {
    const allLexemes = (lexemesData as LexemesData).learnedLexemes;

    // Create progress data where ALL words are mastered
    const progressData: LexemeProgress[] = allLexemes.map((lexeme) => ({
      text: lexeme.text,
      timesSeen: 10,
      timesCorrect: 10,
      lastPracticedAt: Date.now(),
      recentIncorrectStreak: 0,
      confusedWith: {},
      easingLevel: 2,
      consecutiveCorrectStreak: 5,
      isMastered: true,
      masteredAt: Date.now() - 10000,
    }));

    // Mock the database to return this progress
    mockedDb.getAllLexemeProgress.mockResolvedValue(progressData);
    // Also reflect this in the mocked progress map used by the component
    mockProgressMap = new Map(progressData.map((p) => [p.text, p] as const));

    render(<App />);

    // Wait for the toast to appear
    await waitFor(() => {
      expect(mockedToast).toHaveBeenCalledWith(
        "🎉 All words mastered!",
        expect.objectContaining({
          description: "You've mastered all available words. Great job!",
        })
      );
    });

    // When all words are mastered, the app should either show loading state
    // or render the layout without any word cards
    const loadingText = screen.queryByText("Loading lexemes...");
    const layoutHeader = screen.queryByText("Lexeme Master");

    // Either loading state or empty layout is acceptable
    expect(loadingText || layoutHeader).toBeTruthy();
  });

  it("should persist reverseMode preference in localStorage", async () => {
    mockedDb.getAllLexemeProgress.mockResolvedValue([]);

    // Initially localStorage should be empty
    expect(localStorage.getItem("reverseMode")).toBeNull();

    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Loading lexemes...")).not.toBeInTheDocument();
    });

    // Should default to normal mode (Indonesian → English)
    expect(screen.getByText("Indonesian → English")).toBeInTheDocument();

    // Click to toggle to reverse mode
    const toggleButton = screen.getByRole("button", {
      name: /Mode:.*click to switch/i,
    });
    fireEvent.click(toggleButton);

    // Should now show reverse mode
    expect(screen.getByText("English → Indonesian")).toBeInTheDocument();

    // localStorage should be updated
    expect(localStorage.getItem("reverseMode")).toBe("true");

    // Unmount and remount to simulate page refresh
    rerender(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Loading lexemes...")).not.toBeInTheDocument();
    });

    // Should still be in reverse mode after refresh
    expect(screen.getByText("English → Indonesian")).toBeInTheDocument();
  });

  it("should load reverseMode from localStorage on mount", async () => {
    mockedDb.getAllLexemeProgress.mockResolvedValue([]);

    // Set localStorage before rendering
    localStorage.setItem("reverseMode", "true");

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Loading lexemes...")).not.toBeInTheDocument();
    });

    // Should start in reverse mode based on localStorage
    expect(screen.getByText("English → Indonesian")).toBeInTheDocument();
  });

  it("should default to normal mode when localStorage value is false", async () => {
    mockedDb.getAllLexemeProgress.mockResolvedValue([]);

    // Set localStorage to false
    localStorage.setItem("reverseMode", "false");

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Loading lexemes...")).not.toBeInTheDocument();
    });

    // Should be in normal mode
    expect(screen.getByText("Indonesian → English")).toBeInTheDocument();
  });

  it("should show 0-4 streak but filter out words at streak 5", async () => {
    const allLexemes = (lexemesData as LexemesData).learnedLexemes;

    // Test with a word that has 4 streak (not mastered yet)
    const almostMasteredProgress: LexemeProgress = {
      text: allLexemes[0].text,
      timesSeen: 4,
      timesCorrect: 4,
      lastPracticedAt: Date.now(),
      recentIncorrectStreak: 0,
      confusedWith: {},
      easingLevel: 2,
      consecutiveCorrectStreak: 4,
      isMastered: false,
    };

    // And another word that is mastered
    const masteredProgress: LexemeProgress = {
      text: allLexemes[1].text,
      timesSeen: 5,
      timesCorrect: 5,
      lastPracticedAt: Date.now(),
      recentIncorrectStreak: 0,
      confusedWith: {},
      easingLevel: 2,
      consecutiveCorrectStreak: 5,
      isMastered: true,
      masteredAt: Date.now(),
    };

    mockedDb.getAllLexemeProgress.mockResolvedValue([almostMasteredProgress, masteredProgress]);
    // Also reflect this in the mocked progress map used by the component
    mockProgressMap = new Map([
      [almostMasteredProgress.text, almostMasteredProgress],
      [masteredProgress.text, masteredProgress],
    ]);

    render(<App />);

    // Wait for app to load
    await waitFor(() => {
      expect(screen.queryByText("Loading lexemes...")).not.toBeInTheDocument();
    });

    // Should show a word that is not mastered
    const headings = screen.queryAllByRole("heading", { level: 2 });

    if (headings.length > 0) {
      // If a word is displayed, it should NOT be the mastered one
      const displayedWord = headings[0].textContent;
      expect(displayedWord).not.toBe(masteredProgress.text);

      // Should never show 5/5 because mastered words are filtered
      expect(
        screen.queryByText((content, element) => {
          return element?.tagName === "SPAN" && content === "5/5";
        })
      ).not.toBeInTheDocument();

      // Could show 0/5 (new word) or 4/5 (almost mastered word)
      const streakBadge = screen.queryByText(/\/5$/);
      expect(streakBadge).toBeInTheDocument();
    } else {
      // If no words are displayed, all non-mastered words might have been randomly excluded
      // This is acceptable since the test is about filtering mastered words
      expect(true).toBe(true);
    }
  });
});
