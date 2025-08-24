import { useState, useEffect, useCallback, useRef } from "react";

type UseFlashCardOptions = {
  isEnabled?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  onFlip?: () => void;
  onMarkCorrect?: () => void;
  onMarkIncorrect?: () => void;
};

/**
 * Hook for managing flash card state and keyboard shortcuts
 * Provides flip animation state and keyboard navigation
 */
export const useFlashCard = ({
  isEnabled = true,
  onNext,
  onPrevious,
  onFlip,
  onMarkCorrect,
  onMarkIncorrect,
}: UseFlashCardOptions = {}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset flip state when card changes
  const resetCard = useCallback(() => {
    setIsFlipped(false);
    // Don't reset isAnimating here to prevent race conditions
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
  }, []);

  // Flip the card with animation
  const flip = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    setIsFlipped((prev) => !prev);
    onFlip?.();

    // Clear any existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    // Reset animation state after animation completes
    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
      animationTimeoutRef.current = null;
    }, 700); // Match animation duration
  }, [isAnimating, onFlip]);

  // Navigate to next card
  const goNext = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    resetCard();
    onNext?.();

    // Animation cleanup
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
      animationTimeoutRef.current = null;
    }, 300);
  }, [isAnimating, onNext, resetCard]);

  // Navigate to previous card
  const goPrevious = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    resetCard();
    onPrevious?.();

    // Animation cleanup
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
      animationTimeoutRef.current = null;
    }, 300);
  }, [isAnimating, onPrevious, resetCard]);

  // Mark current card as correct
  const markCorrect = useCallback(() => {
    if (isAnimating) return;
    onMarkCorrect?.();
  }, [isAnimating, onMarkCorrect]);

  // Mark current card as incorrect
  const markIncorrect = useCallback(() => {
    if (isAnimating) return;
    onMarkIncorrect?.();
  }, [isAnimating, onMarkIncorrect]);

  // Keyboard event handler
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          markIncorrect();
          break;
        case "ArrowRight":
          e.preventDefault();
          markCorrect();
          break;
        case " ":
          e.preventDefault();
          flip();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEnabled, flip, goNext, goPrevious, markCorrect, markIncorrect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  return {
    isFlipped,
    isAnimating,
    flip,
    goNext,
    goPrevious,
    markCorrect,
    markIncorrect,
    resetCard,
  };
};
