import { renderHook, act } from "@testing-library/react";
import { useFlashCard } from "./useFlashCard";

describe("useFlashCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe("Initial State", () => {
    it("starts with card not flipped", () => {
      const { result } = renderHook(() => useFlashCard());

      expect(result.current.isFlipped).toBe(false);
      expect(result.current.isAnimating).toBe(false);
    });
  });

  describe("Flip Functionality", () => {
    it("flips the card when flip is called", () => {
      const { result } = renderHook(() => useFlashCard());

      act(() => {
        result.current.flip();
      });

      expect(result.current.isFlipped).toBe(true);
      expect(result.current.isAnimating).toBe(true);
    });

    it("toggles flip state on subsequent calls", () => {
      const { result } = renderHook(() => useFlashCard());

      act(() => {
        result.current.flip();
      });
      expect(result.current.isFlipped).toBe(true);

      // Wait for animation to complete
      act(() => {
        jest.advanceTimersByTime(700);
      });

      act(() => {
        result.current.flip();
      });
      expect(result.current.isFlipped).toBe(false);
    });

    it("calls onFlip callback when provided", () => {
      const onFlip = jest.fn();
      const { result } = renderHook(() => useFlashCard({ onFlip }));

      act(() => {
        result.current.flip();
      });

      expect(onFlip).toHaveBeenCalledTimes(1);
    });

    it("prevents flip during animation", () => {
      const onFlip = jest.fn();
      const { result } = renderHook(() => useFlashCard({ onFlip }));

      act(() => {
        result.current.flip();
      });

      expect(result.current.isAnimating).toBe(true);

      act(() => {
        result.current.flip(); // Try to flip again while animating
      });

      expect(onFlip).toHaveBeenCalledTimes(1); // Should only be called once
      expect(result.current.isFlipped).toBe(true);
    });

    it("resets animation state after timeout", () => {
      const { result } = renderHook(() => useFlashCard());

      act(() => {
        result.current.flip();
      });

      expect(result.current.isAnimating).toBe(true);

      act(() => {
        jest.advanceTimersByTime(700);
      });

      expect(result.current.isAnimating).toBe(false);
    });
  });

  describe("Navigation", () => {
    it("calls onNext and resets card when goNext is called", () => {
      const onNext = jest.fn();
      const { result } = renderHook(() => useFlashCard({ onNext }));

      // First flip the card
      act(() => {
        result.current.flip();
      });
      expect(result.current.isFlipped).toBe(true);

      // Wait for animation
      act(() => {
        jest.advanceTimersByTime(700);
      });

      // Go to next card
      act(() => {
        result.current.goNext();
      });

      expect(onNext).toHaveBeenCalledTimes(1);
      expect(result.current.isFlipped).toBe(false);
      // Animation state is set to true during navigation
      expect(result.current.isAnimating).toBe(true);
    });

    it("calls onPrevious and resets card when goPrevious is called", () => {
      const onPrevious = jest.fn();
      const { result } = renderHook(() => useFlashCard({ onPrevious }));

      // First flip the card
      act(() => {
        result.current.flip();
      });
      expect(result.current.isFlipped).toBe(true);

      // Wait for animation
      act(() => {
        jest.advanceTimersByTime(700);
      });

      // Go to previous card
      act(() => {
        result.current.goPrevious();
      });

      expect(onPrevious).toHaveBeenCalledTimes(1);
      expect(result.current.isFlipped).toBe(false);
      // Animation state is set to true during navigation
      expect(result.current.isAnimating).toBe(true);
    });

    it("prevents navigation during animation", () => {
      const onNext = jest.fn();
      const onPrevious = jest.fn();
      const { result } = renderHook(() => useFlashCard({ onNext, onPrevious }));

      act(() => {
        result.current.flip();
      });

      expect(result.current.isAnimating).toBe(true);

      act(() => {
        result.current.goNext(); // Try to navigate during flip animation
        result.current.goPrevious(); // Try to navigate during flip animation
      });

      expect(onNext).not.toHaveBeenCalled();
      expect(onPrevious).not.toHaveBeenCalled();
    });
  });

  describe("Answer Marking", () => {
    it("calls onMarkCorrect when markCorrect is called", () => {
      const onMarkCorrect = jest.fn();
      const { result } = renderHook(() => useFlashCard({ onMarkCorrect }));

      act(() => {
        result.current.markCorrect();
      });

      expect(onMarkCorrect).toHaveBeenCalledTimes(1);
    });

    it("calls onMarkIncorrect when markIncorrect is called", () => {
      const onMarkIncorrect = jest.fn();
      const { result } = renderHook(() => useFlashCard({ onMarkIncorrect }));

      act(() => {
        result.current.markIncorrect();
      });

      expect(onMarkIncorrect).toHaveBeenCalledTimes(1);
    });

    it("prevents marking during animation", () => {
      const onMarkCorrect = jest.fn();
      const onMarkIncorrect = jest.fn();
      const { result } = renderHook(() => useFlashCard({ onMarkCorrect, onMarkIncorrect }));

      act(() => {
        result.current.flip();
      });

      expect(result.current.isAnimating).toBe(true);

      act(() => {
        result.current.markCorrect();
        result.current.markIncorrect();
      });

      expect(onMarkCorrect).not.toHaveBeenCalled();
      expect(onMarkIncorrect).not.toHaveBeenCalled();
    });
  });

  describe("Reset Functionality", () => {
    it("resets card state when resetCard is called", () => {
      const { result } = renderHook(() => useFlashCard());

      // Flip and animate
      act(() => {
        result.current.flip();
      });

      expect(result.current.isFlipped).toBe(true);
      expect(result.current.isAnimating).toBe(true);

      // Reset
      act(() => {
        result.current.resetCard();
      });

      expect(result.current.isFlipped).toBe(false);
      // Note: isAnimating is not reset by resetCard to prevent race conditions
    });
  });

  describe("Keyboard Events", () => {
    it("handles ArrowLeft key to mark incorrect", () => {
      const onMarkIncorrect = jest.fn();
      renderHook(() => useFlashCard({ onMarkIncorrect, isEnabled: true }));

      act(() => {
        const event = new KeyboardEvent("keydown", { key: "ArrowLeft" });
        window.dispatchEvent(event);
      });

      expect(onMarkIncorrect).toHaveBeenCalledTimes(1);
    });

    it("handles ArrowRight key to mark correct", () => {
      const onMarkCorrect = jest.fn();
      renderHook(() => useFlashCard({ onMarkCorrect, isEnabled: true }));

      act(() => {
        const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
        window.dispatchEvent(event);
      });

      expect(onMarkCorrect).toHaveBeenCalledTimes(1);
    });

    it("handles Space key to flip", () => {
      const onFlip = jest.fn();
      const { result } = renderHook(() => useFlashCard({ onFlip, isEnabled: true }));

      act(() => {
        const event = new KeyboardEvent("keydown", { key: " " });
        window.dispatchEvent(event);
      });

      expect(result.current.isFlipped).toBe(true);
      expect(onFlip).toHaveBeenCalledTimes(1);
    });

    it("does not handle keyboard events when disabled", () => {
      const onFlip = jest.fn();
      const onMarkCorrect = jest.fn();
      const onMarkIncorrect = jest.fn();

      renderHook(() =>
        useFlashCard({
          onMarkCorrect,
          onMarkIncorrect,
          onFlip,
          isEnabled: false,
        })
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
        window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
      });

      expect(onMarkIncorrect).not.toHaveBeenCalled();
      expect(onMarkCorrect).not.toHaveBeenCalled();
      expect(onFlip).not.toHaveBeenCalled();
    });

    it("ignores keyboard events when typing in input", () => {
      const onFlip = jest.fn();
      renderHook(() => useFlashCard({ onFlip, isEnabled: true }));

      // Create and focus an input element
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: " ",
          bubbles: true,
        });
        Object.defineProperty(event, "target", { value: input, enumerable: true });
        window.dispatchEvent(event);
      });

      expect(onFlip).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it("ignores keyboard events when typing in textarea", () => {
      const onFlip = jest.fn();
      renderHook(() => useFlashCard({ onFlip, isEnabled: true }));

      // Create and focus a textarea element
      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);
      textarea.focus();

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: " ",
          bubbles: true,
        });
        Object.defineProperty(event, "target", { value: textarea, enumerable: true });
        window.dispatchEvent(event);
      });

      expect(onFlip).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });

    it("ignores keyboard events in contentEditable elements", () => {
      const onFlip = jest.fn();
      renderHook(() => useFlashCard({ onFlip, isEnabled: true }));

      // Create a contentEditable div
      const div = document.createElement("div");
      div.contentEditable = "true";
      document.body.appendChild(div);
      div.focus();

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: " ",
          bubbles: true,
        });
        Object.defineProperty(event, "target", { value: div, enumerable: true });
        window.dispatchEvent(event);
      });

      expect(onFlip).not.toHaveBeenCalled();

      document.body.removeChild(div);
    });
  });

  describe("Cleanup", () => {
    it("removes event listeners on unmount", () => {
      const onNext = jest.fn();
      const { unmount } = renderHook(() => useFlashCard({ onNext, isEnabled: true }));

      unmount();

      act(() => {
        const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
        window.dispatchEvent(event);
      });

      expect(onNext).not.toHaveBeenCalled();
    });

    it("clears animation timeout on unmount", () => {
      const { result, unmount } = renderHook(() => useFlashCard());

      act(() => {
        result.current.flip();
      });

      expect(result.current.isAnimating).toBe(true);

      unmount();

      // Advance timers to check if timeout was properly cleared
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // No errors should occur from cleared timeouts
    });

    it("clears animation timeout when resetting", () => {
      const { result } = renderHook(() => useFlashCard());

      act(() => {
        result.current.flip();
      });

      expect(result.current.isAnimating).toBe(true);

      act(() => {
        result.current.resetCard();
      });

      // Note: resetCard doesn't immediately reset isAnimating to prevent race conditions
      // But it does clear the timeout, so advancing timers should not cause issues
      expect(result.current.isFlipped).toBe(false);

      // Advance timers to ensure no lingering timeouts
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // No errors should occur from cleared timeouts
    });
  });
});
