import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Volume2, ChevronRight, Keyboard, Lightbulb, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/lib/animations";
import { useAutoFocus } from "@/hooks/useAutoFocus";
import { useHint } from "@/hooks/useHint";
import type { Lexeme, LexemeProgress } from "@/types";

type ModernWordCardProps = {
  lexeme: Lexeme;
  onCorrect: () => void;
  onIncorrect: (userAnswer?: string) => void;
  onNext: () => void;
  currentIndex: number;
  totalWords: number;
  progress?: LexemeProgress;
  autoAdvanceOnIncorrect?: boolean;
};

export const ModernWordCard = ({
  lexeme,
  onCorrect,
  onIncorrect,
  onNext,
  currentIndex,
  totalWords,
  progress,
  autoAdvanceOnIncorrect = true,
}: ModernWordCardProps) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset state when lexeme changes
    setShowAnswer(false);
    setUserAnswer("");
    setShowHint(false);
  }, [lexeme]);

  // Use the auto-focus hook for reliable input focusing in writing mode
  useAutoFocus(inputRef, true, [lexeme]);

  const handleCorrect = useCallback(() => {
    onCorrect();
    onNext();
  }, [onCorrect, onNext]);

  // Use the new hint system
  const {
    hint,
    status: hintStatus,
    error: hintError,
    loadHint,
  } = useHint(lexeme, {
    prefetch: false, // Load on demand
  });

  // Handle hint button click
  const handleHintClick = useCallback(() => {
    if (!showHint && hintStatus === "idle") {
      loadHint();
    }
    setShowHint(!showHint);
  }, [showHint, hintStatus, loadHint]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        handleHintClick();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleHintClick]);

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

  const checkAnswer = () => {
    const normalizedInput = normalizeAnswer(userAnswer);

    // Check if the input matches any of the translations
    const correct = lexeme.translations.some((translation) => {
      const normalizedTranslation = normalizeAnswer(translation);

      // Exact match
      if (normalizedInput === normalizedTranslation) return true;

      // Check if translation contains parenthetical info and match the main part
      const mainPart = normalizedTranslation.replace(/\\([^)]*\\)/g, "").trim();
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

    if (correct) {
      handleCorrect();
    } else {
      onIncorrect(userAnswer);
      setShowAnswer(true); // Reveal correct answer
      if (autoAdvanceOnIncorrect) {
        onNext();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userAnswer.trim()) {
      checkAnswer();
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Word {currentIndex + 1} of {totalWords}
          </span>
          <Badge variant="outline" className="gap-1">
            <Keyboard className="h-3 w-3" />
            Space to reveal
          </Badge>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalWords) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Card */}
      <Card
        className={cn("relative overflow-hidden transition-all duration-200", animations.fadeIn)}
      >
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

              <Button
                size="icon"
                variant="outline"
                className="h-12 w-12 rounded-full transition-transform hover:scale-110"
                onClick={playAudio}
              >
                <Volume2 className="h-6 w-6" />
              </Button>
            </div>

            <h2 className="h-16 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              {lexeme.text}
            </h2>

            {/* Phonetic if available */}
            {lexeme.phonetic && (
              <p className="text-lg italic text-muted-foreground">/{lexeme.phonetic}/</p>
            )}
          </div>

          {/* Answer Section */}
          <div className="min-h-[120px] transition-all duration-300">
            {/* Writing Mode */}
            <div className="space-y-4">
              {!showAnswer ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="text-center">
                    <p className="mb-4 text-lg text-muted-foreground">
                      Type the English translation:
                    </p>
                    <Input
                      ref={inputRef}
                      type="text"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Type your answer..."
                      className={cn("w-full max-w-md mx-auto !text-xl text-center h-14")}
                      autoFocus
                    />
                  </div>

                  <div className="flex justify-center gap-3">
                    <Button type="submit" size="lg" disabled={!userAnswer.trim()}>
                      Check Answer
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={handleHintClick}
                      disabled={hintStatus === "loading"}
                    >
                      {hintStatus === "loading" ? (
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Lightbulb className="mr-2 h-5 w-5" />
                      )}
                      {showHint ? "Hide Hint" : "Show Hint"}
                    </Button>
                  </div>

                  {showHint && (
                    <div
                      className={cn(
                        "bg-secondary/50 rounded-lg p-4 max-w-md mx-auto",
                        animations.slideInFromTop
                      )}
                    >
                      {hintStatus === "loading" && (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      )}
                      {hintStatus === "ready" &&
                        hint &&
                        hint.relatedWords &&
                        Array.isArray(hint.relatedWords) && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground/70">
                              Related words:
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                              {hint.relatedWords.map((word, index) => (
                                <span
                                  key={index}
                                  className="inline-block rounded-full bg-secondary px-3 py-1 text-sm font-medium"
                                >
                                  {word}
                                </span>
                              ))}
                            </div>
                            {hint.source === "fallback" && (
                              <p className="mt-2 text-center text-xs opacity-60">(offline hint)</p>
                            )}
                          </div>
                        )}
                      {hintStatus === "error" && (
                        <p className="text-sm text-destructive">
                          ⚠️ {hintError || "Failed to generate hint"}
                        </p>
                      )}
                    </div>
                  )}
                </form>
              ) : (
                // Show correct answer after incorrect response
                <div className={cn("space-y-4", animations.slideInFromBottom)}>
                  <div className="text-center">
                    <p className="mb-4 text-lg text-destructive">
                      Incorrect! The correct answer is:
                    </p>
                    <div className="space-y-2">
                      {lexeme.translations.map((translation, index) => (
                        <div
                          key={index}
                          className="inline-block rounded-lg bg-secondary/30 px-4 py-2 text-xl font-medium md:text-2xl"
                        >
                          {translation}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Example sentence if available */}
                  {lexeme.example && (
                    <div className="mx-auto mt-6 max-w-md rounded-lg bg-muted/30 p-4">
                      <p className="mb-1 text-sm font-medium">Example:</p>
                      <p className="italic text-muted-foreground">{lexeme.example}</p>
                    </div>
                  )}

                  {/* Auto-advancing message */}
                  {autoAdvanceOnIncorrect && (
                    <p className="text-center text-sm text-muted-foreground">
                      Auto-advancing to next word...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Next Button (Always visible) */}
        <div className="absolute bottom-4 right-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            className="gap-1 text-muted-foreground"
          >
            Skip
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Keyboard Shortcuts Info */}
      <div className="mt-4 text-center text-xs text-muted-foreground">
        Press <kbd className="rounded bg-muted px-2 py-1">Enter</kbd> to check answer,
        <kbd className="mx-1 rounded bg-muted px-2 py-1">Ctrl+H</kbd> for hint
      </div>
    </div>
  );
};
