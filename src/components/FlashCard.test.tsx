import { render, screen } from "@/test-utils";
import userEvent from "@testing-library/user-event";
import { FlashCard } from "./FlashCard";
import type { Lexeme, LexemeProgress } from "@/types";

// Mock Audio API
const mockPlay = jest.fn();
const mockAudio = jest.fn().mockImplementation(() => ({
  play: mockPlay,
}));
(globalThis as unknown as { Audio: typeof mockAudio }).Audio = mockAudio;

describe("FlashCard", () => {
  const mockOnFlip = jest.fn();
  const mockOnCorrect = jest.fn();
  const mockOnIncorrect = jest.fn();
  const mockOnMarkAsMastered = jest.fn();

  const baseLexeme: Lexeme = {
    text: "rumah",
    audioURL: "https://example.com/rumah.mp3",
    translations: ["house", "home"],
    phonetic: "roo-mah",
    example: "Ini adalah rumah saya",
  };

  const defaultProps = {
    lexeme: baseLexeme,
    isFlipped: false,
    onFlip: mockOnFlip,
    onCorrect: mockOnCorrect,
    onIncorrect: mockOnIncorrect,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the front face when not flipped", () => {
      render(<FlashCard {...defaultProps} />);

      // Front should show Indonesian word in normal mode
      expect(screen.getByText("rumah")).toBeInTheDocument();
      expect(screen.getByText("Click or press Space to flip")).toBeInTheDocument();
    });

    it("renders translations on front in reverse mode", () => {
      render(<FlashCard {...defaultProps} isReverseMode={true} />);

      // Front should show English translations in reverse mode
      expect(screen.getByText("house, home")).toBeInTheDocument();
    });

    it("applies flip animation when flipped", () => {
      const { container } = render(<FlashCard {...defaultProps} isFlipped={true} />);

      // Check for the transform style instead of class
      const innerCard = container.querySelector('[style*="rotateY(180deg)"]');
      expect(innerCard).toBeInTheDocument();
    });

    it("shows phonetic pronunciation on front in normal mode", () => {
      render(<FlashCard {...defaultProps} />);

      expect(screen.getByText("/roo-mah/")).toBeInTheDocument();
    });

    it("shows phonetic pronunciation on back in reverse mode", () => {
      render(<FlashCard {...defaultProps} isReverseMode={true} isFlipped={true} />);

      expect(screen.getByText("/roo-mah/")).toBeInTheDocument();
    });

    it("displays example sentence on the back face", () => {
      render(<FlashCard {...defaultProps} isFlipped={true} />);

      expect(screen.getByText("Example:")).toBeInTheDocument();
      expect(screen.getByText("Ini adalah rumah saya")).toBeInTheDocument();
    });

    it("shows progress badge with correct streak", () => {
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

      render(<FlashCard {...defaultProps} progress={progress} />);

      expect(screen.getByText("3/5")).toBeInTheDocument();
      expect(screen.getByText("streak")).toBeInTheDocument();
      expect(screen.getByText("🔥")).toBeInTheDocument();
    });

    it("shows NEEDS PRACTICE badge for struggling words", () => {
      const progress: LexemeProgress = {
        text: "rumah",
        timesSeen: 10,
        timesCorrect: 2,
        lastPracticedAt: Date.now(),
        recentIncorrectStreak: 5,
        confusedWith: {},
        easingLevel: 0,
        consecutiveCorrectStreak: 0,
        isMastered: false,
      };

      render(<FlashCard {...defaultProps} progress={progress} />);

      expect(screen.getByText("NEEDS PRACTICE")).toBeInTheDocument();
    });

    it("shows Mark as Mastered button when callback provided", () => {
      render(<FlashCard {...defaultProps} onMarkAsMastered={mockOnMarkAsMastered} />);

      expect(screen.getByRole("button", { name: /mark as mastered/i })).toBeInTheDocument();
    });

    it("hides Mark as Mastered button when word is already mastered", () => {
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

      render(
        <FlashCard
          {...defaultProps}
          onMarkAsMastered={mockOnMarkAsMastered}
          progress={masteredProgress}
        />
      );

      expect(screen.queryByRole("button", { name: /mark as mastered/i })).not.toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls onFlip when card is clicked", async () => {
      const user = userEvent.setup();
      render(<FlashCard {...defaultProps} />);

      const card = screen.getByText("rumah").closest(".cursor-pointer");
      await user.click(card!);

      expect(mockOnFlip).toHaveBeenCalledTimes(1);
    });

    it("calls onFlip when Flip Card button is clicked", async () => {
      const user = userEvent.setup();
      render(<FlashCard {...defaultProps} />);

      const flipButton = screen.getByRole("button", { name: /flip card/i });
      await user.click(flipButton);

      expect(mockOnFlip).toHaveBeenCalledTimes(1);
    });

    // Removed Next/Previous button tests as they no longer exist

    it("calls onCorrect when Got It button is clicked", async () => {
      const user = userEvent.setup();
      render(<FlashCard {...defaultProps} />);

      const correctButton = screen.getByRole("button", { name: /got it/i });
      await user.click(correctButton);

      // Wait for the timeout in handleCorrect to complete
      await new Promise((resolve) => setTimeout(resolve, 450));
      expect(mockOnCorrect).toHaveBeenCalledTimes(1);
    });

    it("calls onIncorrect when Don't Know button is clicked", async () => {
      const user = userEvent.setup();
      render(<FlashCard {...defaultProps} />);

      const incorrectButton = screen.getByRole("button", { name: /don't know/i });
      await user.click(incorrectButton);

      // Wait for the timeout in handleIncorrect to complete
      await new Promise((resolve) => setTimeout(resolve, 450));
      expect(mockOnIncorrect).toHaveBeenCalledTimes(1);
    });

    it("plays audio when audio button is clicked in normal mode", async () => {
      const user = userEvent.setup();
      render(<FlashCard {...defaultProps} />);

      const audioButton = screen
        .getAllByRole("button")
        .find((btn) => btn.querySelector('[class*="lucide-volume"]'));

      await user.click(audioButton!);

      expect(mockAudio).toHaveBeenCalledWith("https://example.com/rumah.mp3");
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it("shows audio button on back face in reverse mode", async () => {
      render(<FlashCard {...defaultProps} isReverseMode={true} isFlipped={true} />);

      const audioButton = screen
        .getAllByRole("button")
        .find((btn) => btn.querySelector('[class*="lucide-volume"]'));

      expect(audioButton).toBeInTheDocument();
    });

    it("does not call onFlip when audio button is clicked", async () => {
      const user = userEvent.setup();
      render(<FlashCard {...defaultProps} />);

      const audioButton = screen
        .getAllByRole("button")
        .find((btn) => btn.querySelector('[class*="lucide-volume"]'));

      await user.click(audioButton!);

      expect(mockOnFlip).not.toHaveBeenCalled();
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it("calls onMarkAsMastered when button is clicked", async () => {
      const user = userEvent.setup();
      render(<FlashCard {...defaultProps} onMarkAsMastered={mockOnMarkAsMastered} />);

      const masterButton = screen.getByRole("button", { name: /mark as mastered/i });
      await user.click(masterButton);

      expect(mockOnMarkAsMastered).toHaveBeenCalledTimes(1);
    });
  });

  describe("Animation States", () => {
    it("disables all buttons when animating", () => {
      render(<FlashCard {...defaultProps} isAnimating={true} />);

      expect(screen.getByRole("button", { name: /flip card/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /got it/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /don't know/i })).toBeDisabled();
    });

    it("prevents click events on card when animating", () => {
      const { container } = render(<FlashCard {...defaultProps} isAnimating={true} />);

      const innerCard = container.querySelector('[class*="pointer-events-none"]');
      expect(innerCard).toBeInTheDocument();
    });
  });

  describe("Keyboard Hints", () => {
    it("shows keyboard hints by default", () => {
      render(<FlashCard {...defaultProps} />);

      // Check for keyboard hint elements
      expect(screen.getByText("Don't know")).toBeInTheDocument();
      expect(screen.getByText("Flip")).toBeInTheDocument();
      expect(screen.getByText("Got it!")).toBeInTheDocument();
    });

    it("hides keyboard hints when showKeyboardHints is false", () => {
      render(<FlashCard {...defaultProps} showKeyboardHints={false} />);

      // These texts should only appear in keyboard hints section
      const hints = screen.queryAllByText((content, element) => {
        const parent = element?.parentElement;
        const className = typeof parent?.className === "string" ? parent.className : "";
        return (
          className.includes("text-muted-foreground") &&
          className.includes("text-xs") &&
          (content === "Don't know" || content === "Got it!" || content === "Flip")
        );
      });

      expect(hints).toHaveLength(0);
    });
  });

  describe("Content Display", () => {
    it("shows both translations on the back face", () => {
      render(<FlashCard {...defaultProps} isFlipped={true} />);

      expect(screen.getByText("house, home")).toBeInTheDocument();
    });

    it("handles single translation correctly", () => {
      const singleTranslation = {
        ...baseLexeme,
        translations: ["book"],
      };

      render(<FlashCard {...defaultProps} lexeme={singleTranslation} isFlipped={true} />);

      expect(screen.getByText("book")).toBeInTheDocument();
    });

    it("handles missing example gracefully", () => {
      const noExample = {
        ...baseLexeme,
        example: undefined,
      };

      render(<FlashCard {...defaultProps} lexeme={noExample} isFlipped={true} />);

      expect(screen.queryByText("Example:")).not.toBeInTheDocument();
    });

    it("handles missing phonetic gracefully", () => {
      const noPhonetic = {
        ...baseLexeme,
        phonetic: undefined,
      };

      render(<FlashCard {...defaultProps} lexeme={noPhonetic} />);

      expect(screen.queryByText(/^\//)).not.toBeInTheDocument();
    });
  });

  describe("Progress Badge Styles", () => {
    const testCases = [
      { streak: 0, emoji: "⭕", colorClass: "gray" },
      { streak: 1, emoji: "✨", colorClass: "blue" },
      { streak: 2, emoji: "⭐", colorClass: "blue" },
      { streak: 3, emoji: "🔥", colorClass: "purple" },
      { streak: 4, emoji: "🎯", colorClass: "orange" },
    ];

    it.each(testCases)(
      "displays correct emoji and color for streak %i",
      ({ streak, emoji, colorClass }) => {
        const progress: LexemeProgress = {
          text: "rumah",
          timesSeen: 5,
          timesCorrect: streak,
          lastPracticedAt: Date.now(),
          recentIncorrectStreak: 0,
          confusedWith: {},
          easingLevel: 1,
          consecutiveCorrectStreak: streak,
          isMastered: false,
        };

        render(<FlashCard {...defaultProps} progress={progress} />);

        expect(screen.getByText(emoji)).toBeInTheDocument();

        const badge = screen.getByText("streak").closest("div");
        expect(badge?.className).toContain(colorClass);
      }
    );
  });
});
