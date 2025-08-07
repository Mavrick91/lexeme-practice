import { renderHook, act } from "@testing-library/react";
import { useLetterHint } from "./useLetterHint";

describe("useLetterHint", () => {
  describe("Single word hints", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useLetterHint({ targetWord: "house", isEnabled: true }));

      expect(result.current.showLetterHint).toBe(false);
      expect(result.current.revealedLetters).toBe(1);
      expect(result.current.letterHint).toBe("");
      expect(result.current.maxLetters).toBe(5);
    });

    it("should toggle letter hint visibility", () => {
      const { result } = renderHook(() => useLetterHint({ targetWord: "house", isEnabled: true }));

      act(() => {
        result.current.toggleLetterHint();
      });

      expect(result.current.showLetterHint).toBe(true);
      expect(result.current.letterHint).toBe("h _ _ _ _");

      act(() => {
        result.current.toggleLetterHint();
      });

      expect(result.current.showLetterHint).toBe(false);
      expect(result.current.letterHint).toBe("");
    });

    it("should reveal more letters", () => {
      const { result } = renderHook(() => useLetterHint({ targetWord: "house", isEnabled: true }));

      act(() => {
        result.current.toggleLetterHint();
      });

      expect(result.current.letterHint).toBe("h _ _ _ _");

      act(() => {
        result.current.revealMoreLetters();
      });

      expect(result.current.revealedLetters).toBe(2);
      expect(result.current.letterHint).toBe("h o _ _ _");

      act(() => {
        result.current.revealMoreLetters();
        result.current.revealMoreLetters();
      });

      expect(result.current.revealedLetters).toBe(4);
      expect(result.current.letterHint).toBe("h o u s _");
    });

    it("should not reveal more than max letters", () => {
      const { result } = renderHook(() => useLetterHint({ targetWord: "cat", isEnabled: true }));

      act(() => {
        result.current.toggleLetterHint();
        result.current.setLetterCount(3);
      });

      expect(result.current.revealedLetters).toBe(3);
      expect(result.current.letterHint).toBe("c a t");

      act(() => {
        result.current.revealMoreLetters();
      });

      expect(result.current.revealedLetters).toBe(3);
      expect(result.current.letterHint).toBe("c a t");
    });

    it("should reveal fewer letters", () => {
      const { result } = renderHook(() => useLetterHint({ targetWord: "house", isEnabled: true }));

      act(() => {
        result.current.toggleLetterHint();
        result.current.setLetterCount(3);
      });

      expect(result.current.letterHint).toBe("h o u _ _");

      act(() => {
        result.current.revealFewerLetters();
      });

      expect(result.current.revealedLetters).toBe(2);
      expect(result.current.letterHint).toBe("h o _ _ _");
    });

    it("should not reveal fewer than 1 letter", () => {
      const { result } = renderHook(() => useLetterHint({ targetWord: "house", isEnabled: true }));

      act(() => {
        result.current.toggleLetterHint();
      });

      expect(result.current.revealedLetters).toBe(1);

      act(() => {
        result.current.revealFewerLetters();
      });

      expect(result.current.revealedLetters).toBe(1);
      expect(result.current.letterHint).toBe("h _ _ _ _");
    });

    it("should reset hint when called", () => {
      const { result } = renderHook(() => useLetterHint({ targetWord: "house", isEnabled: true }));

      act(() => {
        result.current.toggleLetterHint();
        result.current.setLetterCount(3);
      });

      expect(result.current.showLetterHint).toBe(true);
      expect(result.current.revealedLetters).toBe(3);

      act(() => {
        result.current.resetHint();
      });

      expect(result.current.showLetterHint).toBe(false);
      expect(result.current.revealedLetters).toBe(1);
    });
  });

  describe("Multi-word hints", () => {
    it("should handle multi-word targets", () => {
      const { result } = renderHook(() =>
        useLetterHint({ targetWord: "good morning", isEnabled: true })
      );

      act(() => {
        result.current.toggleLetterHint();
      });

      expect(result.current.letterHint).toBe("g _ _ _   _ _ _ _ _ _ _");

      act(() => {
        result.current.setLetterCount(5);
      });

      expect(result.current.letterHint).toBe("g o o d   m _ _ _ _ _ _");

      act(() => {
        result.current.setLetterCount(8);
      });

      expect(result.current.letterHint).toBe("g o o d   m o r n _ _ _");
    });

    it("should handle complete multi-word reveal", () => {
      const { result } = renderHook(() =>
        useLetterHint({ targetWord: "big house", isEnabled: true })
      );

      act(() => {
        result.current.toggleLetterHint();
        result.current.setLetterCount(8);
      });

      expect(result.current.letterHint).toBe("b i g   h o u s e");
      expect(result.current.maxLetters).toBe(8); // Doesn't count the space
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string", () => {
      const { result } = renderHook(() => useLetterHint({ targetWord: "", isEnabled: true }));

      expect(result.current.maxLetters).toBe(0);

      act(() => {
        result.current.toggleLetterHint();
      });

      expect(result.current.letterHint).toBe("");
    });

    it("should not show hint when disabled", () => {
      const { result } = renderHook(() => useLetterHint({ targetWord: "house", isEnabled: false }));

      act(() => {
        result.current.toggleLetterHint();
      });

      expect(result.current.showLetterHint).toBe(true);
      expect(result.current.letterHint).toBe("");
    });

    it("should handle target word changes", () => {
      const { result, rerender } = renderHook(
        ({ targetWord, isEnabled }) => useLetterHint({ targetWord, isEnabled }),
        {
          initialProps: { targetWord: "house", isEnabled: true },
        }
      );

      act(() => {
        result.current.toggleLetterHint();
        result.current.setLetterCount(3);
      });

      expect(result.current.letterHint).toBe("h o u _ _");

      rerender({ targetWord: "cat", isEnabled: true });

      expect(result.current.maxLetters).toBe(3);
      // When target word changes, revealedLetters persists but is capped at new max
      expect(result.current.letterHint).toBe("c a t");
    });

    it("should handle setLetterCount with bounds", () => {
      const { result } = renderHook(() => useLetterHint({ targetWord: "test", isEnabled: true }));

      act(() => {
        result.current.toggleLetterHint();
      });

      act(() => {
        result.current.setLetterCount(10);
      });

      expect(result.current.revealedLetters).toBe(4);

      act(() => {
        result.current.setLetterCount(0);
      });

      expect(result.current.revealedLetters).toBe(1);

      act(() => {
        result.current.setLetterCount(-5);
      });

      expect(result.current.revealedLetters).toBe(1);
    });
  });
});
