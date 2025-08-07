import { useState, useCallback, useMemo } from "react";

type UseLetterHintOptions = {
  targetWord: string;
  isEnabled?: boolean;
};

export const useLetterHint = ({ targetWord, isEnabled = false }: UseLetterHintOptions) => {
  const [showLetterHint, setShowLetterHint] = useState(false);
  const [revealedLetters, setRevealedLetters] = useState(1);

  // Calculate max letters (excluding spaces)
  const maxLetters = useMemo(() => {
    return targetWord.replace(/\s+/g, "").length;
  }, [targetWord]);

  // Reset when target word changes
  const resetHint = useCallback(() => {
    setShowLetterHint(false);
    setRevealedLetters(1);
  }, []);

  // Toggle letter hint visibility
  const toggleLetterHint = useCallback(() => {
    setShowLetterHint((prev) => !prev);
  }, []);

  // Increase number of revealed letters
  const revealMoreLetters = useCallback(() => {
    setRevealedLetters((prev) => Math.min(prev + 1, maxLetters));
  }, [maxLetters]);

  // Decrease number of revealed letters
  const revealFewerLetters = useCallback(() => {
    setRevealedLetters((prev) => Math.max(1, prev - 1));
  }, []);

  // Set specific number of revealed letters
  const setLetterCount = useCallback(
    (count: number) => {
      setRevealedLetters(Math.max(1, Math.min(count, maxLetters)));
    },
    [maxLetters]
  );

  // Helper function to format word with spaces (DRY principle)
  const formatWordWithSpaces = (word: string, lettersToShow: number): string => {
    const revealed = word.slice(0, lettersToShow);
    const hidden = "_".repeat(Math.max(0, word.length - lettersToShow));
    return (revealed + hidden).split("").join(" ");
  };

  // Format display for hint (KISS - simplified logic)
  const formattedHint = useMemo(() => {
    if (!showLetterHint || !isEnabled) return "";

    const words = targetWord.split(" ");

    // Single word case (most common)
    if (words.length === 1) {
      return formatWordWithSpaces(targetWord, revealedLetters);
    }

    // Multi-word case
    let lettersToReveal = revealedLetters;
    const hintWords = words.map((word) => {
      const lettersForThisWord = Math.min(lettersToReveal, word.length);
      lettersToReveal = Math.max(0, lettersToReveal - word.length);
      return formatWordWithSpaces(word, lettersForThisWord);
    });

    return hintWords.join("   "); // Triple space between words
  }, [targetWord, revealedLetters, showLetterHint, isEnabled]);

  return {
    showLetterHint,
    revealedLetters,
    letterHint: formattedHint,
    maxLetters,
    toggleLetterHint,
    revealMoreLetters,
    revealFewerLetters,
    setLetterCount,
    resetHint,
  };
};
