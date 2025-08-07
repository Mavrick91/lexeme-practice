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
      currentIndex: 0,
      totalWords: 10,
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

    it("displays progress indicator correctly", () => {
      renderCard({ currentIndex: 2, totalWords: 4 });

      expect(screen.getByText("Word 3 of 4")).toBeInTheDocument();

      const progressBar = document.querySelector('[style*="width"]');
      expect(progressBar).toHaveStyle({ width: "75%" });
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
          currentIndex={0}
          totalWords={10}
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

    it("handles incorrect answer and auto-advances", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      renderCard();

      const input = screen.getByPlaceholderText("Type your answer...");
      await user.type(input, "wrong");
      await user.keyboard("{Enter}");

      expect(mockOnIncorrect).toHaveBeenCalledTimes(1);
      expect(mockOnIncorrect).toHaveBeenCalledWith("wrong");

      // Auto-advance happens after 2 seconds
      expect(mockOnNext).not.toHaveBeenCalled();
      jest.advanceTimersByTime(2000);
      expect(mockOnNext).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
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
          currentIndex={0}
          totalWords={10}
          autoAdvanceOnIncorrect={true}
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

      if (!shouldBeCorrect) {
        jest.useFakeTimers();
      }

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
        // Advance timer to trigger onNext for incorrect
        jest.advanceTimersByTime(2000);
        expect(mockOnNext).toHaveBeenCalled();
        jest.useRealTimers();
      }
    });
  });
});
