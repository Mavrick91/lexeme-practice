import { useMemo } from "react";

export type LetterColor = "correct" | "present" | "absent" | "space";

export type ColoredLetter = {
  letter: string;
  color: LetterColor;
};

type UseLetterColoringOptions = {
  input: string;
  target: string;
  isEnabled?: boolean;
};

/**
 * Hook that provides Wordle-like letter coloring based on input vs target word.
 * Handles edge cases like duplicate letters correctly.
 */
export const useLetterColoring = ({
  input,
  target,
  isEnabled = true,
}: UseLetterColoringOptions): ColoredLetter[] => {
  const coloredLetters = useMemo(() => {
    if (!isEnabled || !input) {
      return [];
    }

    return getLetterColors(input, target);
  }, [input, target, isEnabled]);

  return coloredLetters;
};

/**
 * Helper function to get letter colors for multi-word targets.
 * Treats each word independently for coloring.
 */
export const useMultiWordLetterColoring = ({
  input,
  target,
  isEnabled = true,
}: UseLetterColoringOptions): ColoredLetter[] => {
  const coloredLetters = useMemo(() => {
    if (!isEnabled || !input) {
      return [];
    }

    // Split into words
    const targetWords = target.split(" ");
    const inputWords = input.split(" ");

    const allColoredLetters: ColoredLetter[] = [];

    // Process each word pair
    for (let wordIdx = 0; wordIdx < Math.max(targetWords.length, inputWords.length); wordIdx++) {
      const targetWord = targetWords[wordIdx] || "";
      const inputWord = inputWords[wordIdx] || "";

      // Add space before word (except first word)
      if (wordIdx > 0 && (inputWords[wordIdx - 1] !== undefined || inputWord)) {
        allColoredLetters.push({ letter: " ", color: "space" });
      }

      // Color the word using the same logic as useLetterColoring but inline
      // (can't call hook inside useMemo)
      const wordColors = getLetterColors(inputWord, targetWord);
      allColoredLetters.push(...wordColors);
    }

    return allColoredLetters;
  }, [input, target, isEnabled]);

  return coloredLetters;
};

/**
 * Pure function to calculate letter colors (extracted from hook for reusability)
 */
const getLetterColors = (input: string, target: string): ColoredLetter[] => {
  if (!input) {
    return [];
  }

  // Normalize for comparison (case-insensitive)
  const normalizedTarget = target.toLowerCase();
  const normalizedInput = input.toLowerCase();

  // Initialize result array
  const result: ColoredLetter[] = [];

  // Count available letters in target (for handling duplicates)
  const targetLetterCounts = new Map<string, number>();
  for (const char of normalizedTarget) {
    if (char !== " ") {
      targetLetterCounts.set(char, (targetLetterCounts.get(char) || 0) + 1);
    }
  }

  // Track used letter counts (for duplicate handling)
  const usedLetterCounts = new Map<string, number>();

  // First pass: Mark exact matches (green) and initialize others
  for (let i = 0; i < normalizedInput.length; i++) {
    const inputChar = normalizedInput[i];
    const originalChar = input[i]; // Preserve original case

    // Handle spaces specially
    if (inputChar === " ") {
      result.push({ letter: originalChar, color: "space" });
      continue;
    }

    // Check if we're beyond target length
    if (i >= normalizedTarget.length) {
      result.push({ letter: originalChar, color: "absent" });
      continue;
    }

    const targetChar = normalizedTarget[i];

    if (inputChar === targetChar) {
      // Exact match - mark as correct and consume from available count
      result.push({ letter: originalChar, color: "correct" });
      usedLetterCounts.set(inputChar, (usedLetterCounts.get(inputChar) || 0) + 1);
    } else {
      // Temporary mark as absent (will check in second pass)
      result.push({ letter: originalChar, color: "absent" });
    }
  }

  // Second pass: Check for present letters (yellow)
  for (let i = 0; i < result.length; i++) {
    if (result[i].color === "absent") {
      const inputChar = normalizedInput[i];

      // Skip spaces
      if (inputChar === " ") continue;

      // Check if this letter exists in target and hasn't been fully consumed
      const targetCount = targetLetterCounts.get(inputChar) || 0;
      const usedCount = usedLetterCounts.get(inputChar) || 0;

      if (targetCount > usedCount) {
        // Letter exists in target and we haven't used all instances
        result[i].color = "present";
        usedLetterCounts.set(inputChar, usedCount + 1);
      }
    }
  }

  return result;
};
