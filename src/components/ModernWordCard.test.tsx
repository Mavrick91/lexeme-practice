import { render, screen, fireEvent, waitFor } from "@/test-utils";
import userEvent from "@testing-library/user-event";
import { ModernWordCard } from "./ModernWordCard";
import { useAutoFocus } from "@/hooks/useAutoFocus";
import { useHint } from "@/hooks/useHint";
import type { Lexeme, LexemeProgress } from "@/types";

// Mock the hooks
jest.mock("@/hooks/useAutoFocus");
jest.mock("@/hooks/useHint");

// Mock Audio API
const mockPlay = jest.fn();
const mockAudio = jest.fn().mockImplementation(() => ({
  play: mockPlay,
}));
(globalThis as unknown as { Audio: typeof mockAudio }).Audio = mockAudio;

describe("ModernWordCard", () => {
  const mockOnCorrect = jest.fn();
  const mockOnIncorrect = jest.fn();
  const mockOnNext = jest.fn();

  // Sample data
  const baseLexeme: Lexeme = {
    text: "rumah",
    audioURL: "https://example.com/rumah.mp3",
    translations: ["house", "home"],
    phonetic: "roo-mah",
    example: "Ini adalah rumah saya",
  };

  const newLexeme: Lexeme = {
    ...baseLexeme,
    text: "buku",
    audioURL: "https://example.com/buku.mp3",
    translations: ["book"],
  };

  const defaultHintMock = {
    hint: null,
    status: "idle" as const,
    error: null,
    loadHint: jest.fn(),
  };

  // Render helper
  const renderCard = (props: Partial<Parameters<typeof ModernWordCard>[0]> = {}) => {
    const defaultProps = {
      lexeme: baseLexeme,
      onCorrect: mockOnCorrect,
      onIncorrect: mockOnIncorrect,
      onNext: mockOnNext,
    };
    return render(<ModernWordCard {...defaultProps} {...props} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAutoFocus as jest.Mock).mockImplementation(() => {});
    (useHint as jest.Mock).mockReturnValue(defaultHintMock);
  });

  describe("Rendering", () => {
    it("renders writing mode UI correctly", () => {
      renderCard();

      expect(screen.getByText("rumah")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Type your answer...")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /reveal answer/i })).not.toBeInTheDocument();
      expect(screen.getByText("Type the English translation:")).toBeInTheDocument();
    });

    it("displays mastery progress counter", () => {
      const progress: LexemeProgress = {
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

      renderCard({ progress });
      expect(screen.getByText("3/5")).toBeInTheDocument();
      expect(screen.getByText("streak")).toBeInTheDocument();
    });

    it("displays counter even for zero streak", () => {
      const progress: LexemeProgress = {
        text: "rumah",
        timesSeen: 5,
        timesCorrect: 3,
        lastPracticedAt: Date.now(),
        recentIncorrectStreak: 0,
        confusedWith: {},
        easingLevel: 1,
        consecutiveCorrectStreak: 0,
        isMastered: false,
      };

      renderCard({ progress });
      expect(screen.getByText("0/5")).toBeInTheDocument();
      expect(screen.getByText("streak")).toBeInTheDocument();
    });

    it("displays counter for words with no progress", () => {
      renderCard({ progress: undefined });
      expect(screen.getByText("0/5")).toBeInTheDocument();
      expect(screen.getByText("streak")).toBeInTheDocument();
    });
  });

  describe("State management", () => {
    it("resets state when lexeme changes", () => {
      const { rerender } = renderCard();

      // Type something
      const input = screen.getByPlaceholderText("Type your answer...");
      fireEvent.change(input, { target: { value: "test" } });
      expect(input).toHaveValue("test");

      // Change lexeme
      rerender(
        <ModernWordCard
          lexeme={newLexeme}
          onCorrect={mockOnCorrect}
          onIncorrect={mockOnIncorrect}
          onNext={mockOnNext}
        />
      );

      // Input should be cleared
      const newInput = screen.getByPlaceholderText("Type your answer...");
      expect(newInput).toHaveValue("");
    });
  });

  describe("Writing mode interactions", () => {
    it("accepts correct answer with normalization", async () => {
      const user = userEvent.setup({ delay: null });
      renderCard();

      const input = screen.getByPlaceholderText("Type your answer...");

      // Test various formats that should all be correct
      await user.type(input, "  HOUSE!!!  ");
      await user.keyboard("{Enter}");

      expect(mockOnCorrect).toHaveBeenCalledTimes(1);

      // Auto-advance happens immediately
      await waitFor(() => expect(mockOnNext).toHaveBeenCalledTimes(1));
    });

    it("accepts alternative translations", async () => {
      const user = userEvent.setup({ delay: null });
      renderCard();

      const input = screen.getByPlaceholderText("Type your answer...");
      await user.type(input, "home");
      await user.keyboard("{Enter}");

      expect(mockOnCorrect).toHaveBeenCalledTimes(1);

      // Auto-advance happens immediately
      await waitFor(() => expect(mockOnNext).toHaveBeenCalledTimes(1));
    });

    it("marks as correct when Mark as Correct button is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderCard();

      const markAsCorrectButton = screen.getByRole("button", { name: /mark as correct/i });
      await user.click(markAsCorrectButton);

      expect(mockOnCorrect).toHaveBeenCalledTimes(1);

      // Auto-advance happens immediately
      await waitFor(() => expect(mockOnNext).toHaveBeenCalledTimes(1));
    });

    it("marks as correct and skips mastered word", async () => {
      const user = userEvent.setup({ delay: null });

      // Mock onCorrect to return justMastered
      mockOnCorrect.mockResolvedValueOnce({ justMastered: true });

      renderCard();

      const markAsCorrectButton = screen.getByRole("button", { name: /mark as correct/i });
      await user.click(markAsCorrectButton);

      expect(mockOnCorrect).toHaveBeenCalledTimes(1);

      // Should call onNext immediately with the word to skip
      await waitFor(() => expect(mockOnNext).toHaveBeenCalledWith("rumah"));
    });

    it("handles incorrect answer and calls onNext immediately", async () => {
      const user = userEvent.setup({ delay: null });
      renderCard();

      const input = screen.getByPlaceholderText("Type your answer...");
      await user.type(input, "wrong");
      await user.keyboard("{Enter}");

      expect(mockOnIncorrect).toHaveBeenCalledTimes(1);
      expect(mockOnIncorrect).toHaveBeenCalledWith("wrong");

      // onNext should be called immediately after incorrect answer
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it("shows and hides hint", async () => {
      jest.setTimeout(10000); // Increase timeout for this test
      const user = userEvent.setup();
      const mockLoadHint = jest.fn();

      // Start with idle status
      (useHint as jest.Mock).mockReturnValue({
        ...defaultHintMock,
        loadHint: mockLoadHint,
      });

      const { rerender } = renderCard();

      const hintButton = screen.getByRole("button", { name: /show hint/i });
      await user.click(hintButton);

      // After clicking, mock returns the hint
      (useHint as jest.Mock).mockReturnValue({
        hint: { relatedWords: ["building", "family", "shelter", "rooms", "door"], source: "gpt" },
        status: "ready",
        error: null,
        loadHint: mockLoadHint,
      });

      rerender(
        <ModernWordCard
          lexeme={baseLexeme}
          onCorrect={mockOnCorrect}
          onIncorrect={mockOnIncorrect}
          onNext={mockOnNext}
        />
      );

      expect(screen.getByText("building")).toBeInTheDocument();
      expect(screen.getByText("family")).toBeInTheDocument();
      expect(screen.getByText("shelter")).toBeInTheDocument();

      // Hide hint
      await user.click(screen.getByRole("button", { name: /hide hint/i }));
      expect(screen.queryByText("building")).not.toBeInTheDocument();
    });

    it("shows hint with Ctrl+H keyboard shortcut", () => {
      renderCard();

      fireEvent.keyDown(window, { ctrlKey: true, key: "h" });

      expect(screen.getByRole("button", { name: /hide hint/i })).toBeInTheDocument();
    });

    it("shows loading state for hint", () => {
      (useHint as jest.Mock).mockReturnValue({
        ...defaultHintMock,
        status: "loading",
      });

      renderCard();

      const hintButton = screen.getByRole("button", { name: /show hint/i });
      expect(hintButton).toBeDisabled();

      // Check for loading spinner in button
      const spinner = hintButton.querySelector('[class*="animate-spin"]');
      expect(spinner).toBeInTheDocument();
    });

    it("shows error state for hint", () => {
      (useHint as jest.Mock).mockReturnValue({
        ...defaultHintMock,
        status: "error",
        error: "Failed to load hint",
      });

      renderCard();

      const hintButton = screen.getByRole("button", { name: /show hint/i });
      fireEvent.click(hintButton);

      expect(screen.getByText(/Failed to load hint/)).toBeInTheDocument();
    });

    it("calls useAutoFocus", () => {
      renderCard();

      expect(useAutoFocus).toHaveBeenCalled();
      const callArgs = (useAutoFocus as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toBe(true); // Should always be enabled
    });
  });

  describe("Common interactions", () => {
    it("calls onMarkAsMastered when Mark as Mastered button is clicked", async () => {
      const mockOnMarkAsMastered = jest.fn();
      const user = userEvent.setup();

      renderCard({ onMarkAsMastered: mockOnMarkAsMastered });

      const markAsMasteredButton = screen.getByRole("button", { name: /mark as mastered/i });
      await user.click(markAsMasteredButton);

      expect(mockOnMarkAsMastered).toHaveBeenCalledTimes(1);
    });

    it("hides Mark as Mastered button when word is already mastered", () => {
      const mockOnMarkAsMastered = jest.fn();
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

      renderCard({ onMarkAsMastered: mockOnMarkAsMastered, progress: masteredProgress });

      expect(screen.queryByRole("button", { name: /mark as mastered/i })).not.toBeInTheDocument();
    });

    it("plays audio when audio button is clicked", async () => {
      renderCard();

      const audioButton = screen.getByRole("button", { name: "" });
      const volumeIcon = audioButton.querySelector('[class*="lucide-volume"]');
      expect(volumeIcon).toBeTruthy();

      fireEvent.click(audioButton);

      expect(mockAudio).toHaveBeenCalledWith("https://example.com/rumah.mp3");
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });
  });

  describe("UI details", () => {
    it("shows correct keyboard shortcuts for writing mode", () => {
      renderCard();

      expect(screen.getByText(/Enter/)).toBeInTheDocument();
      expect(screen.getByText(/Ctrl\+H/)).toBeInTheDocument();
    });

    it("disables check button when input is empty", () => {
      renderCard();

      const checkButton = screen.getByRole("button", { name: /check answer/i });
      expect(checkButton).toBeDisabled();
    });

    it("enables check button when input has value", async () => {
      jest.setTimeout(10000); // Increase timeout for this test
      const user = userEvent.setup();
      renderCard();

      const input = screen.getByPlaceholderText("Type your answer...");
      await user.type(input, "test");

      const checkButton = screen.getByRole("button", { name: /check answer/i });
      expect(checkButton).toBeEnabled();
    });
  });

  describe("Answer normalization edge cases", () => {
    const testCases = [
      ["house", true],
      ["HOUSE", true],
      ["  house  ", true],
      ["house.", true],
      ["house!!!", true],
      ["h o u s e", false], // Too many spaces
      ["hous", false], // Partial word
      ["houses", false], // Extra letters
    ];

    it.each(testCases)("input '%s' should be %s", async (input, shouldBeCorrect) => {
      jest.setTimeout(10000); // Increase timeout for parameterized tests
      const user = userEvent.setup({ delay: null });

      renderCard();

      const inputElement = screen.getByPlaceholderText("Type your answer...");
      await user.type(inputElement, String(input));
      await user.keyboard("{Enter}");

      if (shouldBeCorrect) {
        expect(mockOnCorrect).toHaveBeenCalled();
        // onNext is called immediately for correct answers
        await waitFor(() => expect(mockOnNext).toHaveBeenCalled());
      } else {
        expect(mockOnIncorrect).toHaveBeenCalled();
        // onNext is called immediately for incorrect answers too now
        expect(mockOnNext).toHaveBeenCalled();
      }
    });
  });

  describe("Reverse mode (English to Indonesian)", () => {
    it("displays English translations instead of Indonesian word", () => {
      renderCard({ isReverseMode: true });

      // Should show translations
      expect(screen.getByText("house, home")).toBeInTheDocument();
      // Should not show Indonesian word as the main text
      expect(screen.queryByRole("heading", { name: "rumah" })).not.toBeInTheDocument();
    });

    it("hides audio button in reverse mode", () => {
      renderCard({ isReverseMode: true });

      // Audio button should not be present
      const audioButtons = screen.queryAllByRole("button").filter((button) => {
        const volumeIcon = button.querySelector('[class*="lucide-volume"]');
        return volumeIcon !== null;
      });
      expect(audioButtons).toHaveLength(0);
    });

    it("hides phonetic pronunciation in reverse mode", () => {
      renderCard({ isReverseMode: true });

      // Phonetic should not be shown
      expect(screen.queryByText("/roo-mah/")).not.toBeInTheDocument();
    });

    it("shows correct prompt text in reverse mode", () => {
      renderCard({ isReverseMode: true });

      expect(screen.getByText("Type the Indonesian word:")).toBeInTheDocument();
      expect(screen.queryByText("Type the English translation:")).not.toBeInTheDocument();
    });

    it("shows correct placeholder in reverse mode", () => {
      renderCard({ isReverseMode: true });

      const input = screen.getByPlaceholderText("Type the Indonesian word...");
      expect(input).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Type your answer...")).not.toBeInTheDocument();
    });

    it("accepts correct Indonesian answer in reverse mode", async () => {
      const user = userEvent.setup({ delay: null });
      renderCard({ isReverseMode: true });

      const input = screen.getByPlaceholderText("Type the Indonesian word...");
      await user.type(input, "rumah");
      await user.keyboard("{Enter}");

      expect(mockOnCorrect).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(mockOnNext).toHaveBeenCalledTimes(1));
    });

    it("handles incorrect answer in reverse mode", async () => {
      const user = userEvent.setup({ delay: null });
      renderCard({ isReverseMode: true });

      const input = screen.getByPlaceholderText("Type the Indonesian word...");
      await user.type(input, "buku");
      await user.keyboard("{Enter}");

      expect(mockOnIncorrect).toHaveBeenCalledTimes(1);
      expect(mockOnIncorrect).toHaveBeenCalledWith("buku");

      // onNext should be called immediately
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it("normalizes Indonesian answer correctly in reverse mode", async () => {
      const user = userEvent.setup({ delay: null });
      renderCard({ isReverseMode: true });

      const input = screen.getByPlaceholderText("Type the Indonesian word...");

      // Test with different capitalizations and spaces
      await user.type(input, "  RUMAH  ");
      await user.keyboard("{Enter}");

      expect(mockOnCorrect).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(mockOnNext).toHaveBeenCalledTimes(1));
    });

    it("rejects English translations as answers in reverse mode", async () => {
      const user = userEvent.setup({ delay: null });
      renderCard({ isReverseMode: true });

      const input = screen.getByPlaceholderText("Type the Indonesian word...");

      // Try entering the English translation instead
      await user.type(input, "house");
      await user.keyboard("{Enter}");

      expect(mockOnIncorrect).toHaveBeenCalledTimes(1);
      expect(mockOnCorrect).not.toHaveBeenCalled();
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it("Mark as Correct button works in reverse mode", async () => {
      const user = userEvent.setup({ delay: null });
      renderCard({ isReverseMode: true });

      const markAsCorrectButton = screen.getByRole("button", { name: /mark as correct/i });
      await user.click(markAsCorrectButton);

      expect(mockOnCorrect).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(mockOnNext).toHaveBeenCalledTimes(1));
    });
  });

  describe("Streak counter logic", () => {
    it("displays 0/5 for words with no progress", () => {
      renderCard({ progress: undefined });

      const badge = screen.getByText((content, element) => {
        return element?.tagName === "SPAN" && content === "0/5";
      });
      expect(badge).toBeInTheDocument();
      expect(screen.getByText("streak")).toBeInTheDocument();
    });

    it("displays 0/5 for words with zero streak", () => {
      const progress: LexemeProgress = {
        text: "rumah",
        timesSeen: 5,
        timesCorrect: 3,
        lastPracticedAt: Date.now(),
        recentIncorrectStreak: 0,
        confusedWith: {},
        easingLevel: 1,
        consecutiveCorrectStreak: 0,
        isMastered: false,
      };

      renderCard({ progress });

      const badge = screen.getByText((content, element) => {
        return element?.tagName === "SPAN" && content === "0/5";
      });
      expect(badge).toBeInTheDocument();
    });

    it("displays correct streak count for 1-4 streaks", () => {
      const testCases = [1, 2, 3, 4];

      testCases.forEach((streak) => {
        const { unmount } = renderCard({
          progress: {
            text: "rumah",
            timesSeen: 5,
            timesCorrect: 3,
            lastPracticedAt: Date.now(),
            recentIncorrectStreak: 0,
            confusedWith: {},
            easingLevel: 1,
            consecutiveCorrectStreak: streak,
            isMastered: false,
          },
        });

        const badge = screen.getByText((content, element) => {
          return element?.tagName === "SPAN" && content === `${streak}/5`;
        });
        expect(badge).toBeInTheDocument();

        unmount();
      });
    });

    it("can display 5/5 if passed mastered progress (though app should filter these)", () => {
      // Note: In normal app usage, mastered words are filtered out and never shown.
      // This test just verifies the component can handle mastered progress if passed.
      const progress: LexemeProgress = {
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

      renderCard({ progress });

      const badge = screen.getByText((content, element) => {
        return element?.tagName === "SPAN" && content === "5/5";
      });
      expect(badge).toBeInTheDocument();
    });

    it("updates streak visual indicators based on progress", () => {
      // Test different visual states
      const visualTests = [
        { streak: 0, expectedEmoji: "⭕", expectedClass: "gray" },
        { streak: 1, expectedEmoji: "✨", expectedClass: "blue" },
        { streak: 2, expectedEmoji: "⭐", expectedClass: "blue" },
        { streak: 3, expectedEmoji: "🔥", expectedClass: "purple" },
        { streak: 4, expectedEmoji: "🎯", expectedClass: "orange" },
      ];

      visualTests.forEach(({ streak, expectedEmoji, expectedClass }) => {
        const { unmount } = renderCard({
          progress: {
            text: "rumah",
            timesSeen: 5,
            timesCorrect: 3,
            lastPracticedAt: Date.now(),
            recentIncorrectStreak: 0,
            confusedWith: {},
            easingLevel: 1,
            consecutiveCorrectStreak: streak,
            isMastered: false,
          },
        });

        // Check emoji
        expect(screen.getByText(expectedEmoji)).toBeInTheDocument();

        // Check that the badge has the appropriate styling class
        const badge = screen.getByText("streak").closest("div");
        if (badge) {
          expect(badge.className).toContain(expectedClass);
        }

        unmount();
      });
    });

    it("handles undefined emojis for undefined progress", () => {
      renderCard({ progress: undefined });

      // Should show the default emoji for no progress
      expect(screen.getByText("⭕")).toBeInTheDocument();
    });
  });

  describe("Mode switching", () => {
    it("maintains normal mode display when isReverseMode is false", () => {
      renderCard({ isReverseMode: false });

      // Should show Indonesian word
      expect(screen.getByText("rumah")).toBeInTheDocument();
      // Should show normal prompt
      expect(screen.getByText("Type the English translation:")).toBeInTheDocument();
      // Should show normal placeholder
      expect(screen.getByPlaceholderText("Type your answer...")).toBeInTheDocument();
    });

    it("maintains normal mode display when isReverseMode is undefined", () => {
      renderCard(); // No isReverseMode prop

      // Should show Indonesian word
      expect(screen.getByText("rumah")).toBeInTheDocument();
      // Should show normal prompt
      expect(screen.getByText("Type the English translation:")).toBeInTheDocument();
      // Should show normal placeholder
      expect(screen.getByPlaceholderText("Type your answer...")).toBeInTheDocument();
    });

    it("shows audio button in normal mode", () => {
      renderCard({ isReverseMode: false });

      // Audio button should be present
      const audioButtons = screen.queryAllByRole("button").filter((button) => {
        const volumeIcon = button.querySelector('[class*="lucide-volume"]');
        return volumeIcon !== null;
      });
      expect(audioButtons.length).toBeGreaterThan(0);
    });

    it("shows phonetic in normal mode", () => {
      renderCard({ isReverseMode: false });

      expect(screen.getByText("/roo-mah/")).toBeInTheDocument();
    });
  });
});
