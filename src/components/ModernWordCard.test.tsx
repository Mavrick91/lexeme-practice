import { render, screen, fireEvent } from "@/test-utils";
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
    isNew: false,
  };

  const newLexeme: Lexeme = {
    ...baseLexeme,
    text: "buku",
    audioURL: "https://example.com/buku.mp3",
    translations: ["book"],
    isNew: true,
  };

  const masteredProgress: LexemeProgress = {
    text: "rumah",
    timesSeen: 3,
    timesCorrect: 3,
    lastPracticedAt: Date.now(),
    mastered: true,
    recentIncorrectStreak: 0,
    confusedWith: {},
    easingLevel: 1,
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
      mode: "flashcard" as const,
      onCorrect: mockOnCorrect,
      onIncorrect: mockOnIncorrect,
      onNext: mockOnNext,
      currentIndex: 0,
      totalWords: 10,
      autoAdvanceOnIncorrect: true,
    };
    return render(<ModernWordCard {...defaultProps} {...props} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAutoFocus as jest.Mock).mockImplementation(() => {});
    (useHint as jest.Mock).mockReturnValue(defaultHintMock);
  });

  describe("Rendering", () => {
    it("renders flashcard UI correctly", () => {
      renderCard({ mode: "flashcard" });

      expect(screen.getByText("rumah")).toBeInTheDocument();
      expect(screen.getByText("/roo-mah/")).toBeInTheDocument();
      // In flashcard mode, it shows the answer immediately
      expect(screen.getByText("house")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /didn't know/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /got it/i })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Type your answer...")).not.toBeInTheDocument();
    });

    it("renders writing mode UI correctly", () => {
      renderCard({ mode: "writing" });

      expect(screen.getByText("rumah")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Type your answer...")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /reveal answer/i })).not.toBeInTheDocument();
      expect(screen.getByText("Type the English translation:")).toBeInTheDocument();
    });

    it("shows NEW badge for new lexemes", () => {
      renderCard({ lexeme: newLexeme });

      expect(screen.getByText("NEW")).toBeInTheDocument();
    });

    it("shows MASTERED badge for mastered lexemes", () => {
      renderCard({ progress: masteredProgress });

      expect(screen.getByText("MASTERED")).toBeInTheDocument();
    });

    it("displays progress indicator correctly", () => {
      renderCard({ currentIndex: 2, totalWords: 4 });

      expect(screen.getByText("Word 3 of 4")).toBeInTheDocument();

      const progressBar = document.querySelector('[style*="width"]');
      expect(progressBar).toHaveStyle({ width: "75%" });
    });
  });

  describe("State management", () => {
    it("resets state when lexeme changes", () => {
      const { rerender } = renderCard({ mode: "writing" });

      // Type something in writing mode
      const input = screen.getByPlaceholderText("Type your answer...");
      fireEvent.change(input, { target: { value: "test" } });
      expect(input).toHaveValue("test");

      // Change lexeme
      rerender(
        <ModernWordCard
          lexeme={newLexeme}
          mode="writing"
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

  describe("Flashcard mode interactions", () => {
    it("shows translations immediately in flashcard mode", () => {
      renderCard({ mode: "flashcard" });

      // Answer is shown immediately
      expect(screen.getByText("house")).toBeInTheDocument();
      expect(screen.getByText("home")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /didn't know/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /got it/i })).toBeInTheDocument();
    });

    it("handles incorrect response with keyboard shortcut 1", () => {
      renderCard({ mode: "flashcard" });

      // Press 1 for incorrect
      fireEvent.keyDown(window, { key: "1" });

      expect(mockOnIncorrect).toHaveBeenCalledTimes(1);
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it("handles correct response with keyboard shortcut 2", () => {
      renderCard({ mode: "flashcard" });

      // Press 2 for correct
      fireEvent.keyDown(window, { key: "2" });

      expect(mockOnCorrect).toHaveBeenCalledTimes(1);
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it("shows example sentence when available", () => {
      renderCard({ mode: "flashcard" });

      expect(screen.getByText("Example:")).toBeInTheDocument();
      expect(screen.getByText("Ini adalah rumah saya")).toBeInTheDocument();
    });
  });

  describe("Writing mode interactions", () => {
    it("accepts correct answer with normalization", async () => {
      const user = userEvent.setup();
      renderCard({ mode: "writing" });

      const input = screen.getByPlaceholderText("Type your answer...");

      // Test various formats that should all be correct
      await user.type(input, "  HOUSE!!!  ");
      await user.keyboard("{Enter}");

      expect(mockOnCorrect).toHaveBeenCalledTimes(1);
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it("accepts alternative translations", async () => {
      const user = userEvent.setup();
      renderCard({ mode: "writing" });

      const input = screen.getByPlaceholderText("Type your answer...");
      await user.type(input, "home");
      await user.keyboard("{Enter}");

      expect(mockOnCorrect).toHaveBeenCalledTimes(1);
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it("handles incorrect answer and shows translations", async () => {
      const user = userEvent.setup();
      renderCard({ mode: "writing" });

      const input = screen.getByPlaceholderText("Type your answer...");
      await user.type(input, "wrong");
      await user.keyboard("{Enter}");

      expect(mockOnIncorrect).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Incorrect! The correct answer is:")).toBeInTheDocument();
      expect(screen.getByText("house")).toBeInTheDocument();
      expect(screen.getByText("home")).toBeInTheDocument();
      expect(mockOnNext).toHaveBeenCalledTimes(1); // Auto-advance
    });

    it("does not auto-advance when disabled", async () => {
      const user = userEvent.setup();
      renderCard({ mode: "writing", autoAdvanceOnIncorrect: false });

      const input = screen.getByPlaceholderText("Type your answer...");
      await user.type(input, "wrong");
      await user.keyboard("{Enter}");

      expect(mockOnIncorrect).toHaveBeenCalledTimes(1);
      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it("shows and hides hint", async () => {
      const user = userEvent.setup();
      const mockLoadHint = jest.fn();

      // Start with idle status
      (useHint as jest.Mock).mockReturnValue({
        ...defaultHintMock,
        loadHint: mockLoadHint,
      });

      const { rerender } = renderCard({ mode: "writing" });

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
          mode="writing"
          onCorrect={mockOnCorrect}
          onIncorrect={mockOnIncorrect}
          onNext={mockOnNext}
          currentIndex={0}
          totalWords={10}
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
      renderCard({ mode: "writing" });

      fireEvent.keyDown(window, { ctrlKey: true, key: "h" });

      expect(screen.getByRole("button", { name: /hide hint/i })).toBeInTheDocument();
    });

    it("shows loading state for hint", () => {
      (useHint as jest.Mock).mockReturnValue({
        ...defaultHintMock,
        status: "loading",
      });

      renderCard({ mode: "writing" });

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

      renderCard({ mode: "writing" });

      const hintButton = screen.getByRole("button", { name: /show hint/i });
      fireEvent.click(hintButton);

      expect(screen.getByText(/Failed to load hint/)).toBeInTheDocument();
    });

    it("calls useAutoFocus in writing mode", () => {
      renderCard({ mode: "writing" });

      expect(useAutoFocus).toHaveBeenCalled();
      const callArgs = (useAutoFocus as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toBe(true); // Should be enabled in writing mode
    });
  });

  describe("Common interactions", () => {
    it("plays audio when audio button is clicked", () => {
      renderCard();

      const audioButton = screen.getByRole("button", { name: "" });
      const volumeIcon = audioButton.querySelector('[class*="lucide-volume"]');
      expect(volumeIcon).toBeTruthy();

      fireEvent.click(audioButton);

      expect(mockAudio).toHaveBeenCalledWith("https://example.com/rumah.mp3");
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it("skip button calls onNext", () => {
      renderCard();

      fireEvent.click(screen.getByRole("button", { name: /skip/i }));

      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("UI details", () => {
    it("shows correct keyboard shortcuts for flashcard mode", () => {
      renderCard({ mode: "flashcard" });

      // Find the keyboard shortcut elements
      const kbdElements = screen.getAllByText((_, element) => element?.tagName === "KBD");

      const kbdTexts = kbdElements.map((el) => el.textContent);
      expect(kbdTexts).toContain("Space");
      expect(kbdTexts).toContain("1");
      expect(kbdTexts).toContain("2");
    });

    it("shows correct keyboard shortcuts for writing mode", () => {
      renderCard({ mode: "writing" });

      expect(screen.getByText(/Enter/)).toBeInTheDocument();
      expect(screen.getByText(/Ctrl\+H/)).toBeInTheDocument();
    });

    it("disables check button when input is empty", () => {
      renderCard({ mode: "writing" });

      const checkButton = screen.getByRole("button", { name: /check answer/i });
      expect(checkButton).toBeDisabled();
    });

    it("enables check button when input has value", async () => {
      const user = userEvent.setup();
      renderCard({ mode: "writing" });

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
      const user = userEvent.setup();
      renderCard({ mode: "writing" });

      const inputElement = screen.getByPlaceholderText("Type your answer...");
      await user.type(inputElement, String(input));
      await user.keyboard("{Enter}");

      if (shouldBeCorrect) {
        expect(mockOnCorrect).toHaveBeenCalled();
      } else {
        expect(mockOnIncorrect).toHaveBeenCalled();
      }
    });
  });
});
