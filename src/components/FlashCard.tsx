import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, RotateCw, Check, X, Trophy, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/lib/animations";
import type { Lexeme, LexemeProgress } from "@/types";

type FlashCardProps = {
  lexeme: Lexeme;
  isReverseMode?: boolean;
  isFlipped: boolean;
  isAnimating?: boolean;
  onFlip: () => void;
  onCorrect: () => void;
  onIncorrect: () => void;
  onMarkAsMastered?: () => void;
  progress?: LexemeProgress | null;
  showKeyboardHints?: boolean;
  feedbackAnimation?: "correct" | "incorrect" | null;
  onAnimationComplete?: () => void;
};

export const FlashCard = ({
  lexeme,
  isReverseMode = false,
  isFlipped,
  isAnimating = false,
  onFlip,
  onCorrect,
  onIncorrect,
  onMarkAsMastered,
  progress,
  showKeyboardHints = true,
  feedbackAnimation: externalFeedback,
  onAnimationComplete,
}: FlashCardProps) => {
  const [localFeedback, setLocalFeedback] = useState<"correct" | "incorrect" | null>(null);
  const feedbackAnimation = externalFeedback || localFeedback;

  // Clear animation after it plays
  useEffect(() => {
    if (feedbackAnimation) {
      const timer = setTimeout(() => {
        setLocalFeedback(null);
        onAnimationComplete?.();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [feedbackAnimation, onAnimationComplete]);

  const handleCorrect = () => {
    setLocalFeedback("correct");
    setTimeout(() => {
      onCorrect();
    }, 400);
  };

  const handleIncorrect = () => {
    setLocalFeedback("incorrect");
    setTimeout(() => {
      onIncorrect();
    }, 400);
  };
  const playAudio = () => {
    const audio = new Audio(lexeme.audioURL);
    audio.play();
  };

  // Determine what to show on front and back based on mode
  const frontContent = isReverseMode ? lexeme.translations.join(", ") : lexeme.text;

  const backContent = isReverseMode ? lexeme.text : lexeme.translations.join(", ");

  const renderProgressBadge = () => {
    if (!progress) return null;

    const streak = progress.consecutiveCorrectStreak || 0;
    const emoji =
      streak === 0
        ? "⭕"
        : streak === 1
          ? "✨"
          : streak === 2
            ? "⭐"
            : streak === 3
              ? "🔥"
              : streak === 4
                ? "🎯"
                : "🏆";

    const colorClass =
      streak === 0
        ? "border-gray-300 bg-gray-50 text-gray-600"
        : streak === 1
          ? "border-blue-300 bg-blue-50 text-blue-700"
          : streak === 2
            ? "border-blue-400 bg-blue-100 text-blue-800"
            : streak === 3
              ? "border-purple-400 bg-purple-100 text-purple-800 animate-pulse"
              : streak === 4
                ? "border-orange-400 bg-orange-100 text-orange-800 animate-pulse shadow-md"
                : "border-green-400 bg-green-100 text-green-800 shadow-lg";

    return (
      <Badge
        variant="outline"
        className={cn(
          "absolute left-4 top-4 z-20 text-xs font-semibold transition-all duration-300",
          colorClass
        )}
      >
        <span className="mr-1">{emoji}</span>
        <span className="font-mono">{streak}/5</span>
        <span className="ml-1">streak</span>
      </Badge>
    );
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Feedback Animation Overlay */}
      {feedbackAnimation && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          {feedbackAnimation === "correct" ? (
            <div className="animate-zoom-in-150">
              <CheckCircle className="h-32 w-32 text-green-500 drop-shadow-2xl" strokeWidth={3} />
            </div>
          ) : (
            <div className="animate-zoom-in-150">
              <XCircle className="h-32 w-32 text-red-500 drop-shadow-2xl" strokeWidth={3} />
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "relative h-96 transition-all duration-300",
          feedbackAnimation === "correct" && "scale-105",
          feedbackAnimation === "incorrect" && animations.shake
        )}
        style={{ perspective: "1000px" }}
      >
        {/* Progress Badge - Above the card */}
        {renderProgressBadge()}

        {/* Struggling Badge */}
        {progress?.easingLevel === 0 && (
          <Badge variant="destructive" className="absolute right-4 top-4 z-20 gap-1">
            <RotateCw className="h-3 w-3" />
            NEEDS PRACTICE
          </Badge>
        )}

        {/* 3D Card Container */}
        <div
          className={cn(
            "relative w-full h-full transition-transform duration-700",
            isAnimating && "pointer-events-none"
          )}
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front Face */}
          <Card
            className={cn(
              "absolute w-full h-full flex flex-col items-center justify-center p-8 cursor-pointer",
              "hover:shadow-xl transition-all duration-200 rounded-lg",
              feedbackAnimation === "correct" &&
                "ring-4 ring-green-400 bg-green-50 dark:bg-green-950/20",
              feedbackAnimation === "incorrect" &&
                "ring-4 ring-red-400 bg-red-50 dark:bg-red-950/20"
            )}
            style={{
              backfaceVisibility: "hidden",
            }}
            onClick={onFlip}
          >
            <div className="space-y-4 text-center">
              {!isReverseMode && (
                <Button
                  size="icon"
                  variant="outline"
                  className="h-12 w-12 rounded-full transition-transform hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    playAudio();
                  }}
                >
                  <Volume2 className="h-6 w-6" />
                </Button>
              )}

              <h2 className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
                {frontContent}
              </h2>

              {!isReverseMode && lexeme.phonetic && (
                <p className="text-lg italic text-muted-foreground">/{lexeme.phonetic}/</p>
              )}

              <p className="mt-4 text-sm text-muted-foreground">Click or press Space to flip</p>
            </div>
          </Card>

          {/* Back Face */}
          <Card
            className={cn(
              "absolute w-full h-full flex flex-col items-center justify-center p-8 cursor-pointer bg-secondary/5",
              "hover:shadow-xl transition-all duration-200 rounded-lg",
              feedbackAnimation === "correct" &&
                "ring-4 ring-green-400 bg-green-50 dark:bg-green-950/20",
              feedbackAnimation === "incorrect" &&
                "ring-4 ring-red-400 bg-red-50 dark:bg-red-950/20"
            )}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
            onClick={onFlip}
          >
            <div className="space-y-4 text-center">
              {isReverseMode && (
                <Button
                  size="icon"
                  variant="outline"
                  className="h-12 w-12 rounded-full transition-transform hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    playAudio();
                  }}
                >
                  <Volume2 className="h-6 w-6" />
                </Button>
              )}

              <h2 className="text-4xl font-bold text-foreground md:text-5xl">{backContent}</h2>

              {isReverseMode && lexeme.phonetic && (
                <p className="text-lg italic text-muted-foreground">/{lexeme.phonetic}/</p>
              )}

              {lexeme.example && (
                <div className="mt-6 rounded-lg bg-background/50 p-4">
                  <p className="text-sm text-muted-foreground">Example:</p>
                  <p className="mt-1 text-base">{lexeme.example}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col gap-4">
        {/* Flip Control */}
        <div className="flex justify-center">
          <Button
            variant="default"
            size="lg"
            onClick={onFlip}
            disabled={isAnimating}
            className="min-w-[140px] gap-2"
          >
            <RotateCw className="h-5 w-5" />
            Flip Card
          </Button>
        </div>

        {/* Answer Controls */}
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            size="default"
            onClick={handleIncorrect}
            disabled={isAnimating || feedbackAnimation !== null}
            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            <X className="h-4 w-4" />
            Don't Know
          </Button>

          <Button
            variant="outline"
            size="default"
            onClick={handleCorrect}
            disabled={isAnimating || feedbackAnimation !== null}
            className="gap-2 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
          >
            <Check className="h-4 w-4" />
            Got It!
          </Button>
        </div>

        {/* Mark as Mastered */}
        {onMarkAsMastered && !progress?.isMastered && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkAsMastered}
              className="gap-1 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
            >
              <Trophy className="h-4 w-4" />
              Mark as Mastered
            </Button>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Info */}
      {showKeyboardHints && (
        <div className="mt-6 space-y-1 text-center text-xs text-muted-foreground">
          <div className="flex justify-center gap-4">
            <span>
              <kbd className="rounded bg-muted px-2 py-1">←</kbd> Don't know
            </span>
            <span>
              <kbd className="rounded bg-muted px-2 py-1">Space</kbd> Flip
            </span>
            <span>
              <kbd className="rounded bg-muted px-2 py-1">→</kbd> Got it!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
