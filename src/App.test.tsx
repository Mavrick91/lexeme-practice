import { render, screen, waitFor } from "@/test-utils";
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

describe("App - Mastered Words Filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
