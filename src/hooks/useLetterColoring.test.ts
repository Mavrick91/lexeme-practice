import { renderHook } from "@testing-library/react";
import { useLetterColoring, useMultiWordLetterColoring } from "./useLetterColoring";

describe("useLetterColoring", () => {
  describe("Basic functionality", () => {
    it("should return empty array when input is empty", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "", target: "house", isEnabled: true })
      );

      expect(result.current).toEqual([]);
    });

    it("should return empty array when disabled", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "test", target: "house", isEnabled: false })
      );

      expect(result.current).toEqual([]);
    });

    it("should mark all correct letters when input matches target", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "house", target: "house", isEnabled: true })
      );

      expect(result.current).toEqual([
        { letter: "h", color: "correct" },
        { letter: "o", color: "correct" },
        { letter: "u", color: "correct" },
        { letter: "s", color: "correct" },
        { letter: "e", color: "correct" },
      ]);
    });

    it("should handle case insensitive matching", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "HOUSE", target: "house", isEnabled: true })
      );

      expect(result.current).toEqual([
        { letter: "H", color: "correct" },
        { letter: "O", color: "correct" },
        { letter: "U", color: "correct" },
        { letter: "S", color: "correct" },
        { letter: "E", color: "correct" },
      ]);
    });

    it("should mark absent letters that don't exist in target", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "xyz", target: "abc", isEnabled: true })
      );

      expect(result.current).toEqual([
        { letter: "x", color: "absent" },
        { letter: "y", color: "absent" },
        { letter: "z", color: "absent" },
      ]);
    });

    it("should mark present letters in wrong position", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "esuoh", target: "house", isEnabled: true })
      );

      expect(result.current).toEqual([
        { letter: "e", color: "present" }, // e exists but wrong position
        { letter: "s", color: "present" }, // s exists but wrong position
        { letter: "u", color: "correct" }, // u in correct position
        { letter: "o", color: "present" }, // o exists but wrong position
        { letter: "h", color: "present" }, // h exists but wrong position
      ]);
    });
  });

  describe("Duplicate letter handling", () => {
    it("should handle duplicate letters in target correctly", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "level", target: "level", isEnabled: true })
      );

      expect(result.current).toEqual([
        { letter: "l", color: "correct" },
        { letter: "e", color: "correct" },
        { letter: "v", color: "correct" },
        { letter: "e", color: "correct" },
        { letter: "l", color: "correct" },
      ]);
    });

    it("should handle when input has more instances of a letter than target", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "ooops", target: "robot", isEnabled: true })
      );

      // robot has 2 o's at positions 1 and 3
      expect(result.current).toEqual([
        { letter: "o", color: "present" }, // o exists but wrong position
        { letter: "o", color: "correct" }, // o in correct position
        { letter: "o", color: "absent" }, // third o - already used up 2 o's
        { letter: "p", color: "absent" }, // p not in word
        { letter: "s", color: "absent" }, // s not in word
      ]);
    });

    it("should prioritize exact matches over present matches for duplicates", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "llama", target: "level", isEnabled: true })
      );

      expect(result.current).toEqual([
        { letter: "l", color: "correct" }, // exact match
        { letter: "l", color: "present" }, // l exists elsewhere (position 4)
        { letter: "a", color: "absent" }, // a not in word
        { letter: "m", color: "absent" }, // m not in word
        { letter: "a", color: "absent" }, // a not in word
      ]);
    });

    it("should handle complex duplicate scenario", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "speed", target: "erase", isEnabled: true })
      );

      // erase has: e(0), r(1), a(2), s(3), e(4)
      // speed has: s(0), p(1), e(2), e(3), d(4)
      expect(result.current).toEqual([
        { letter: "s", color: "present" }, // s exists at position 3
        { letter: "p", color: "absent" }, // p not in word
        { letter: "e", color: "present" }, // e exists (at positions 0 and 4)
        { letter: "e", color: "present" }, // second e still valid (target has 2 e's)
        { letter: "d", color: "absent" }, // d not in word
      ]);
    });

    it("should correctly handle 'erase' target with 'eeeee' input", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "eeeee", target: "erase", isEnabled: true })
      );

      // erase has 2 e's at positions 0 and 4
      expect(result.current).toEqual([
        { letter: "e", color: "correct" }, // exact match at position 0
        { letter: "e", color: "absent" }, // no match at position 1
        { letter: "e", color: "absent" }, // no match at position 2
        { letter: "e", color: "absent" }, // no match at position 3
        { letter: "e", color: "correct" }, // exact match at position 4
      ]);
    });
  });

  describe("Edge cases", () => {
    it("should handle input longer than target", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "houses", target: "house", isEnabled: true })
      );

      expect(result.current).toEqual([
        { letter: "h", color: "correct" },
        { letter: "o", color: "correct" },
        { letter: "u", color: "correct" },
        { letter: "s", color: "correct" },
        { letter: "e", color: "correct" },
        { letter: "s", color: "absent" }, // beyond target length
      ]);
    });

    it("should handle input shorter than target", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "cat", target: "catch", isEnabled: true })
      );

      expect(result.current).toEqual([
        { letter: "c", color: "correct" },
        { letter: "a", color: "correct" },
        { letter: "t", color: "correct" },
      ]);
    });

    it("should handle spaces in input", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "a b c", target: "abc", isEnabled: true })
      );

      expect(result.current).toEqual([
        { letter: "a", color: "correct" },
        { letter: " ", color: "space" },
        { letter: "b", color: "present" }, // b exists but at wrong position due to space
        { letter: " ", color: "space" },
        { letter: "c", color: "present" }, // c exists but at wrong position due to spaces
      ]);
    });

    it("should preserve original case in output", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "HeLLo", target: "hello", isEnabled: true })
      );

      expect(result.current).toEqual([
        { letter: "H", color: "correct" },
        { letter: "e", color: "correct" },
        { letter: "L", color: "correct" },
        { letter: "L", color: "correct" },
        { letter: "o", color: "correct" },
      ]);
    });

    it("should handle empty target", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "test", target: "", isEnabled: true })
      );

      expect(result.current).toEqual([
        { letter: "t", color: "absent" },
        { letter: "e", color: "absent" },
        { letter: "s", color: "absent" },
        { letter: "t", color: "absent" },
      ]);
    });
  });

  describe("Real-world examples", () => {
    it("should handle 'world' guess for 'wordle'", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "world", target: "wordle", isEnabled: true })
      );

      // wordle: w(0), o(1), r(2), d(3), l(4), e(5)
      // world:  w(0), o(1), r(2), l(3), d(4)
      expect(result.current).toEqual([
        { letter: "w", color: "correct" },
        { letter: "o", color: "correct" },
        { letter: "r", color: "correct" },
        { letter: "l", color: "present" }, // l exists at position 4
        { letter: "d", color: "present" }, // d exists at position 3
      ]);
    });

    it("should handle 'paper' guess for 'apple'", () => {
      const { result } = renderHook(() =>
        useLetterColoring({ input: "paper", target: "apple", isEnabled: true })
      );

      expect(result.current).toEqual([
        { letter: "p", color: "present" }, // p exists at positions 1-2
        { letter: "a", color: "present" }, // a exists at position 0
        { letter: "p", color: "correct" }, // p in correct position
        { letter: "e", color: "present" }, // e exists at position 4
        { letter: "r", color: "absent" }, // r not in word
      ]);
    });
  });
});

describe("useMultiWordLetterColoring", () => {
  it("should handle multi-word targets", () => {
    const { result } = renderHook(() =>
      useMultiWordLetterColoring({
        input: "good morning",
        target: "good morning",
        isEnabled: true,
      })
    );

    expect(result.current).toEqual([
      { letter: "g", color: "correct" },
      { letter: "o", color: "correct" },
      { letter: "o", color: "correct" },
      { letter: "d", color: "correct" },
      { letter: " ", color: "space" },
      { letter: "m", color: "correct" },
      { letter: "o", color: "correct" },
      { letter: "r", color: "correct" },
      { letter: "n", color: "correct" },
      { letter: "i", color: "correct" },
      { letter: "n", color: "correct" },
      { letter: "g", color: "correct" },
    ]);
  });

  it("should handle mismatched word counts", () => {
    const { result } = renderHook(() =>
      useMultiWordLetterColoring({
        input: "hello",
        target: "hello world",
        isEnabled: true,
      })
    );

    // When input is just "hello" without a space, it's treated as single word
    // So we add the space since target has multiple words
    expect(result.current).toEqual([
      { letter: "h", color: "correct" },
      { letter: "e", color: "correct" },
      { letter: "l", color: "correct" },
      { letter: "l", color: "correct" },
      { letter: "o", color: "correct" },
      { letter: " ", color: "space" }, // Space added since target has multiple words
    ]);
  });

  it("should handle partial multi-word input", () => {
    const { result } = renderHook(() =>
      useMultiWordLetterColoring({
        input: "good night",
        target: "good morning",
        isEnabled: true,
      })
    );

    expect(result.current).toEqual([
      { letter: "g", color: "correct" },
      { letter: "o", color: "correct" },
      { letter: "o", color: "correct" },
      { letter: "d", color: "correct" },
      { letter: " ", color: "space" },
      { letter: "n", color: "present" }, // n exists in morning
      { letter: "i", color: "present" }, // i exists in morning
      { letter: "g", color: "present" }, // g exists at end of morning
      { letter: "h", color: "absent" },
      { letter: "t", color: "absent" },
    ]);
  });
});
