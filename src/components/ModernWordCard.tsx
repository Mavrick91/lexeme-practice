import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Volume2, Eye, EyeOff, Sparkles, ChevronRight, Keyboard, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/lib/animations";
import { useAutoFocus } from "@/hooks/useAutoFocus";
import type { Lexeme } from "@/types";

type ModernWordCardProps = {
  lexeme: Lexeme;
  mode: "flashcard" | "writing";
  onCorrect: () => void;
  onIncorrect: () => void;
  onNext: () => void;
  currentIndex: number;
  totalWords: number;
};

export function ModernWordCard({
  lexeme,
  mode,
  onCorrect,
  onIncorrect,
  onNext,
  currentIndex,
  totalWords,
}: ModernWordCardProps) {
  const [showAnswer, setShowAnswer] = useState(true);
  const [isFlipping, setIsFlipping] = useState(true);
  const [userAnswer, setUserAnswer] = useState("");
  const [showHint, setShowHint] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset state when lexeme changes
    setShowAnswer(true);
    setUserAnswer("");
    setShowHint(true);
  }, [lexeme, mode]);

  // Use the auto-focus hook for reliable input focusing in writing mode
  useAutoFocus(inputRef, mode === "writing", [lexeme]);

  const handleCorrect = useCallback(() => {
    onCorrect();
    setTimeout(onNext, 800);
  }, [onCorrect, onNext]);

  const handleIncorrect = useCallback(() => {
    onIncorrect();
  }, [onIncorrect]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (mode === "flashcard") {
        if (e.code === "Space" && !showAnswer) {
          e.preventDefault();
          handleReveal();
        } else if (e.key === "1" && showAnswer) {
          handleIncorrect();
        } else if (e.key === "2" && showAnswer) {
          handleCorrect();
        }
      } else if (mode === "writing") {
        if ((e.ctrlKey || e.metaKey) && e.key === "h") {
          e.preventDefault();
          setShowHint(!showHint);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleCorrect, handleIncorrect, mode, showAnswer, showHint]);

  const playAudio = () => {
    const audio = new Audio(lexeme.audioURL);
    audio.play();
  };

  const handleReveal = () => {
    setIsFlipping(true);
    setTimeout(() => {
      setShowAnswer(true);
      setIsFlipping(false);
    }, 150);
  };

  const getHint = () => {
    const firstTranslation = lexeme.translations[0];
    const words = firstTranslation.split(" ");
    if (words.length > 1) {
      return `${words.length} words • First letter: ${firstTranslation[0].toUpperCase()}`;
    }
    return `${firstTranslation.length} letters • Starts with: ${firstTranslation[0].toUpperCase()}`;
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
      onCorrect();
      setTimeout(() => {
        onNext();
      }, 1500);
    } else {
      onIncorrect();
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
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          isFlipping && "scale-95",
          animations.fadeIn
        )}
      >
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

        {/* Card Content */}
        <div className="relative p-8 md:p-12">
          {/* Word Section */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-4">
              {lexeme.isNew && (
                <Badge variant="default" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  NEW
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
          <div
            className={cn(
              "min-h-[120px] transition-all duration-300",
              mode === "flashcard" && !showAnswer && "flex items-center justify-center"
            )}
          >
            {mode === "flashcard" ? (
              // Flashcard Mode
              !showAnswer ? (
                <div className="text-center">
                  <Button size="lg" onClick={handleReveal} className="gap-2 px-8 text-lg">
                    <Eye className="h-5 w-5" />
                    Reveal Answer
                  </Button>
                </div>
              ) : (
                <div className={cn("space-y-4", animations.slideInFromBottom)}>
                  <div className="space-y-2 text-center">
                    {lexeme.translations.map((translation, index) => (
                      <div
                        key={index}
                        className="inline-block rounded-lg bg-secondary/30 px-4 py-2 text-xl font-medium md:text-2xl"
                      >
                        {translation}
                      </div>
                    ))}
                  </div>

                  {/* Example sentence if available */}
                  {lexeme.example && (
                    <div className="mt-6 rounded-lg bg-muted/30 p-4">
                      <p className="mb-1 text-sm font-medium">Example:</p>
                      <p className="italic text-muted-foreground">{lexeme.example}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-8 flex justify-center gap-3">
                    <Button
                      size="lg"
                      variant="destructive"
                      onClick={handleIncorrect}
                      className="gap-2"
                    >
                      <EyeOff className="h-5 w-5" />
                      Didn't Know
                    </Button>
                    <Button
                      size="lg"
                      className="gap-2 bg-green-600 hover:bg-green-700"
                      onClick={handleCorrect}
                    >
                      <Eye className="h-5 w-5" />
                      Got It!
                    </Button>
                  </div>
                </div>
              )
            ) : (
              // Writing Mode
              <div className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="text-center">
                    <p className="mb-4 text-lg text-muted-foreground">
                      Type the English translation:
                    </p>
                    <Input
                      ref={inputRef}
                      type="text"
                      value={userAnswer}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUserAnswer(e.target.value)
                      }
                      placeholder="Type your answer..."
                      className={cn("w-full max-w-md mx-auto text-xl text-center h-14")}
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
                      onClick={() => setShowHint(!showHint)}
                    >
                      <Lightbulb className="mr-2 h-5 w-5" />
                      {showHint ? "Hide Hint" : "Show Hint"}
                    </Button>
                  </div>

                  {showHint && (
                    <p
                      className={cn(
                        "text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3 max-w-md mx-auto",
                        animations.slideInFromTop
                      )}
                    >
                      💡 {getHint()}
                    </p>
                  )}
                </form>
              </div>
            )}
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
        {mode === "flashcard" ? (
          <>
            Press <kbd className="rounded bg-muted px-2 py-1">Space</kbd> to reveal,
            <kbd className="mx-1 rounded bg-muted px-2 py-1">1</kbd> for incorrect,
            <kbd className="mx-1 rounded bg-muted px-2 py-1">2</kbd> for correct
          </>
        ) : (
          <>
            Press <kbd className="rounded bg-muted px-2 py-1">Enter</kbd> to check answer,
            <kbd className="mx-1 rounded bg-muted px-2 py-1">Ctrl+H</kbd> for hint
          </>
        )}
      </div>
    </div>
  );
}
