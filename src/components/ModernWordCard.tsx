import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, Trophy, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/lib/animations";
import { useAutoFocus } from "@/hooks/useAutoFocus";
import { useLetterColoring } from "@/hooks/useLetterColoring";
import { ColoredInput } from "./ColoredInput";
import type { Lexeme, LexemeProgress } from "@/types";

type ModernWordCardProps = {
  lexeme: Lexeme;
  isReverseMode?: boolean; // true = English to Indonesian
  onCorrect: () => void | Promise<void> | Promise<{ justMastered: boolean }>;
  onIncorrect: (userAnswer?: string) => void | Promise<void>;
  onNext: (skipMasteredWord?: string) => void;
  onMarkAsMastered?: () => void | Promise<void>;
  progress?: LexemeProgress | null;
};

export const ModernWordCard = ({
  lexeme,
  isReverseMode = false,
  onCorrect,
  onIncorrect,
  onNext,
  onMarkAsMastered,
  progress,
}: ModernWordCardProps) => {
  const [userAnswer, setUserAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine the target word based on mode
  const targetWord = isReverseMode
    ? lexeme.text // In reverse mode, user types Indonesian word
    : lexeme.translations[0]; // In normal mode, user types English translation

  // Use the letter coloring hook for real-time feedback
  const coloredLetters = useLetterColoring({
    input: userAnswer,
    target: targetWord,
    isEnabled: true, // Always enabled to show placeholders
  });

  // Track the previous lexeme to detect actual word changes
  const prevLexemeRef = useRef(lexeme.text);

  useEffect(() => {
    // Only reset when lexeme actually changes to a different word
    if (prevLexemeRef.current !== lexeme.text) {
      setUserAnswer("");
      prevLexemeRef.current = lexeme.text;
    }
  }, [lexeme.text]);

  // Use the auto-focus hook for reliable input focusing in writing mode
  useAutoFocus(inputRef, true, [lexeme]);

  const handleCorrect = useCallback(async () => {
    const result = await onCorrect();
    // Don't call onNext here - let checkAnswer handle advancement
    return result;
  }, [onCorrect]);

  // Manual override - treat current card as answered correctly
  const markCurrentAsCorrect = useCallback(async () => {
    setUserAnswer(""); // Clear input when marking as correct
    const result = await handleCorrect();
    // Advance immediately (same as automatic correct answers)
    const skipWord = (result as { justMastered?: boolean })?.justMastered ? lexeme.text : undefined;
    onNext(skipWord);
  }, [handleCorrect, onNext, lexeme.text]);

  const playAudio = () => {
    const audio = new Audio(lexeme.audioURL);
    audio.play();
  };

  const normalizeAnswer = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:'"]/g, "")
      .replace(/\s+/g, " ");
  };

  const checkAnswer = async () => {
    const normalizedInput = normalizeAnswer(userAnswer);

    let correct: boolean;

    if (isReverseMode) {
      // In reverse mode, check if input matches the Indonesian word
      const normalizedLexeme = normalizeAnswer(lexeme.text);
      correct = normalizedInput === normalizedLexeme;
    } else {
      // Normal mode: Check if the input matches any of the translations
      correct = lexeme.translations.some((translation) => {
        const normalizedTranslation = normalizeAnswer(translation);

        // Exact match
        if (normalizedInput === normalizedTranslation) return true;

        // Check if translation contains parenthetical info and match the main part
        const mainPart = normalizedTranslation.replace(/\([^)]*\)/g, "").trim();
        if (normalizedInput === mainPart) return true;

        // For multi-word translations, check if all words are present
        const inputWords = normalizedInput.split(" ");
        const translationWords = mainPart.split(" ");

        // Check if it's a valid subset match (for compound words)
        if (translationWords.length > 1 && inputWords.length === 1) {
          return translationWords.some((word) => word === normalizedInput);
        }

        return false;
      });
    }

    if (correct) {
      setUserAnswer(""); // Clear input after correct answer
      const result = await handleCorrect();
      // Pass the word if it was just mastered so it can be skipped
      const skipWord = (result as { justMastered?: boolean })?.justMastered
        ? lexeme.text
        : undefined;
      onNext(skipWord);
    } else {
      setUserAnswer(""); // Clear input after incorrect answer
      await onIncorrect(userAnswer);
      onNext();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userAnswer.trim()) {
      await checkAnswer();
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Main Card */}
      <Card
        className={cn("relative overflow-hidden transition-all duration-200", animations.fadeIn)}
      >
        {/* Mastery Progress Badge - Always show since mastered words are never displayed */}
        {
          <Badge
            variant="outline"
            className={cn(
              "absolute left-4 top-4 z-10 text-xs font-semibold transition-all duration-300",
              progress?.consecutiveCorrectStreak === 0 &&
                "border-gray-300 bg-gray-50 text-gray-600",
              progress?.consecutiveCorrectStreak === 1 &&
                "border-blue-300 bg-blue-50 text-blue-700",
              progress?.consecutiveCorrectStreak === 2 &&
                "border-blue-400 bg-blue-100 text-blue-800",
              progress?.consecutiveCorrectStreak === 3 &&
                "border-purple-400 bg-purple-100 text-purple-800 animate-pulse",
              progress?.consecutiveCorrectStreak === 4 &&
                "border-orange-400 bg-orange-100 text-orange-800 animate-pulse shadow-md",
              progress?.consecutiveCorrectStreak === undefined &&
                "border-gray-300 bg-gray-50 text-gray-600"
            )}
          >
            <span className="mr-1">
              {progress?.consecutiveCorrectStreak === 0 && "⭕"}
              {progress?.consecutiveCorrectStreak === 1 && "✨"}
              {progress?.consecutiveCorrectStreak === 2 && "⭐"}
              {progress?.consecutiveCorrectStreak === 3 && "🔥"}
              {progress?.consecutiveCorrectStreak === 4 && "🎯"}
              {progress?.consecutiveCorrectStreak === undefined && "⭕"}
            </span>
            <span className="font-mono">{progress?.consecutiveCorrectStreak || 0}/5</span>
            <span className="ml-1">streak</span>
          </Badge>
        }

        {/* Decorative Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

        {/* Card Content */}
        <div className="relative p-8 md:p-12">
          {/* Word Section */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-4">
              {/* Struggling Badge */}
              {progress?.easingLevel === 0 && (
                <Badge variant="destructive" className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  NEEDS PRACTICE
                </Badge>
              )}

              {!isReverseMode && (
                <Button
                  size="icon"
                  variant="outline"
                  className="h-12 w-12 rounded-full transition-transform hover:scale-110"
                  onClick={playAudio}
                >
                  <Volume2 className="h-6 w-6" />
                </Button>
              )}
            </div>

            <h2 className="min-h-16 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              {isReverseMode ? lexeme.translations.join(", ") : lexeme.text}
            </h2>

            {/* Phonetic if available - only show in normal mode */}
            {!isReverseMode && lexeme.phonetic && (
              <p className="text-lg italic text-muted-foreground">/{lexeme.phonetic}/</p>
            )}
          </div>

          {/* Answer Section */}
          <div className="min-h-[120px] transition-all duration-300">
            {/* Writing Mode */}
            <div className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* ColoredInput replaces both the preview and the input */}
                <ColoredInput
                  ref={inputRef}
                  value={userAnswer}
                  coloredLetters={coloredLetters}
                  maxLength={targetWord.length}
                  onChange={setUserAnswer}
                  onSubmit={checkAnswer}
                  isReverseMode={isReverseMode}
                  // Pass target so users can click tiles to reveal letters
                  target={targetWord}
                />

                <div className="flex justify-center gap-3">
                  <Button type="submit" size="lg" disabled={!userAnswer.trim()}>
                    Check Answer
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={markCurrentAsCorrect}
                  >
                    <Check className="mr-2 h-5 w-5" />
                    Mark as Correct
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Action Buttons (Mark as Mastered only) */}
        {onMarkAsMastered && !progress?.isMastered && (
          <div className="absolute bottom-4 right-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkAsMastered()}
              className="gap-1 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
            >
              <Trophy className="h-4 w-4" />
              Mark as Mastered
            </Button>
          </div>
        )}
      </Card>

      {/* Keyboard Shortcuts Info */}
      <div className="mt-4 text-center text-xs text-muted-foreground">
        <div>
          Press <kbd className="rounded bg-muted px-2 py-1">Enter</kbd> to check answer
        </div>
      </div>
    </div>
  );
};
