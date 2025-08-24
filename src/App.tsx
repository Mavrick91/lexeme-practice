"use client";

import { useState, useEffect, useCallback } from "react";
import { Layout } from "./components/Layout";
import { ModernWordCard } from "./components/ModernWordCard";
import { FlashCard } from "./components/FlashCard";
import { PracticeHistory } from "./components/PracticeHistory";
import { DashboardSidebar } from "./components/DashboardSidebar";
import { MobileStatsSheet } from "./components/MobileStatsSheet";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useProgress } from "./hooks/useProgress";
import { useFlashCard } from "./hooks/useFlashCard";
import type { LexemesData, Lexeme, PracticeHistoryItem } from "./types";
import lexemesData from "./combined_lexemes.json";
import {
  getPracticeHistory,
  addPracticeHistoryItem,
  clearPracticeHistory as clearDBHistory,
  clearAllChatConversations,
  clearAllLexemeProgress,
  getReadyDB,
} from "./db";
import { tryCatch } from "./lib/tryCatch";

const AppContent = () => {
  const [currentLexeme, setCurrentLexeme] = useState<Lexeme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [practiceHistory, setPracticeHistory] = useState<PracticeHistoryItem[]>([]);
  const [isReverseMode, setIsReverseMode] = useState<boolean>(() => {
    // Load reverse mode preference from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("reverseMode");
      return saved === "true";
    }
    return false;
  });
  const [isFlashCardMode, setIsFlashCardMode] = useState<boolean>(() => {
    // Load flash card mode preference from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("flashCardMode");
      return saved === "true";
    }
    return false;
  });
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [feedbackAnimation, setFeedbackAnimation] = useState<"correct" | "incorrect" | null>(null);

  const { recordAnswer, markAsMastered, getProgress, progressMap } = useProgress();

  // Handle reverse mode toggle with localStorage persistence
  const handleToggleReverseMode = () => {
    const newMode = !isReverseMode;
    setIsReverseMode(newMode);
    localStorage.setItem("reverseMode", String(newMode));
  };

  // Handle flash card mode toggle with localStorage persistence
  const handleToggleFlashCardMode = () => {
    const newMode = !isFlashCardMode;
    setIsFlashCardMode(newMode);
    localStorage.setItem("flashCardMode", String(newMode));
    // Reset flash card state when toggling
    flashCardControls.resetCard();
  };

  // Function to pick a random lexeme (excluding mastered words)
  const pickRandomLexeme = useCallback((): Lexeme | null => {
    const data = lexemesData as LexemesData;
    const allLexemes = data.learnedLexemes;

    if (allLexemes.length === 0) {
      toast("No words available", {
        description: "There are no words in the database.",
        duration: 5000,
      });
      return null;
    }

    // Filter out mastered words
    const availableLexemes = allLexemes.filter((lexeme) => {
      const progress = progressMap.get(lexeme.text);
      return !progress?.isMastered; // Include if not mastered or no progress yet
    });

    if (availableLexemes.length === 0) {
      toast("🎉 All words mastered!", {
        description: "You've mastered all available words. Great job!",
        duration: 5000,
      });
      return null;
    }

    // Pick a random word from available (non-mastered) lexemes
    return availableLexemes[Math.floor(Math.random() * availableLexemes.length)];
  }, [progressMap]);

  // Load practice history from IndexedDB on mount
  useEffect(() => {
    const loadHistory = async () => {
      // Wait for database to be ready before loading history
      await getReadyDB();

      const [history, error] = await tryCatch(() => getPracticeHistory());

      if (error) {
        console.error("Failed to load practice history:", error);
        toast.error("Failed to load practice history");
        return;
      }

      setPracticeHistory(history);
    };

    loadHistory();
  }, []);

  // Track when progress data is loaded
  useEffect(() => {
    // progressMap is initially empty, wait for it to be populated
    // Even if there's no saved progress, the useProgress hook will have finished loading
    setProgressLoaded(true);
  }, [progressMap]);

  useEffect(() => {
    // Wait for progress data to be loaded before picking first word
    if (!progressLoaded) {
      return;
    }

    const next = pickRandomLexeme();
    if (!next) {
      setIsLoading(false);
      return;
    }
    setCurrentLexeme(next);
    setIsLoading(false);
  }, [pickRandomLexeme, progressLoaded]);

  const handleNext = async () => {
    const next = pickRandomLexeme();

    if (!next) {
      toast("No more words available", {
        description: "Unable to load next word.",
        duration: 3000,
      });
      return;
    }

    setCurrentLexeme(next);
  };

  // Moved after handler definitions

  const handleMarkCorrect = async (lexeme: Lexeme) => {
    // Add to practice history
    const historyItem: PracticeHistoryItem = {
      id: `${Date.now()}-${Math.random()}`,
      word: lexeme.text,
      translation: lexeme.translations,
      isCorrect: true,
      timestamp: Date.now(),
      isReverseMode,
    };

    // Save to IndexedDB
    const [, error] = await tryCatch(() => addPracticeHistoryItem(historyItem));

    if (error) {
      console.error("Failed to save practice history:", error);
    }

    // Always update local state
    setPracticeHistory((prev) => [historyItem, ...prev.slice(0, 99)]); // Keep last 100 items, newest first

    // Record answer and get updated progress
    const updatedProgress = await recordAnswer(lexeme, true);

    // Check if the word just became mastered
    if (updatedProgress.isMastered && updatedProgress.consecutiveCorrectStreak === 5) {
      // Show celebration toast only for newly mastered words
      toast.success(
        <div className="flex items-center gap-3">
          <span className="animate-bounce text-2xl">🎉</span>
          <div>
            <div className="font-bold">"${lexeme.text}" MASTERED!</div>
            <div className="text-sm opacity-90">This word won't appear in practice anymore.</div>
          </div>
        </div>,
        {
          duration: 5000,
          className:
            "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-300 dark:border-green-700",
        }
      );

      // Return indication that word was just mastered
      return { justMastered: true };
    }

    return { justMastered: false };
  };

  const handleMarkAsMastered = async (lexeme: Lexeme) => {
    await markAsMastered(lexeme);

    // Show celebration toast
    toast.success(`🎉 "${lexeme.text}" marked as MASTERED!`, {
      description: "This word won't appear in practice anymore.",
      duration: 3000,
    });

    // Move to next word immediately, passing the word to skip
    await handleNext();
  };

  const handleMarkIncorrect = async (lexeme: Lexeme, userAnswer?: string) => {
    // Add to practice history
    const historyItem: PracticeHistoryItem = {
      id: `${Date.now()}-${Math.random()}`,
      word: lexeme.text,
      translation: lexeme.translations,
      isCorrect: false,
      timestamp: Date.now(),
      isReverseMode,
    };

    // Save to IndexedDB
    const [, error] = await tryCatch(() => addPracticeHistoryItem(historyItem));

    if (error) {
      console.error("Failed to save practice history:", error);
    }

    // Always update local state
    setPracticeHistory((prev) => [historyItem, ...prev.slice(0, 99)]); // Keep last 100 items, newest first

    // Record answer with response time and user's answer for mistake tracking
    await recordAnswer(lexeme, false, userAnswer);
  };

  const handleClearHistory = async () => {
    // Clear practice history
    const [, historyError] = await tryCatch(() => clearDBHistory());

    if (historyError) {
      console.error("Failed to clear practice history:", historyError);
      toast.error("Failed to clear practice history");
      return;
    }

    // Clear chat conversations
    const [, chatError] = await tryCatch(() => clearAllChatConversations());

    if (chatError) {
      console.error("Failed to clear chat conversations:", chatError);
      // Don't show error to user, just log it
    }

    setPracticeHistory([]);
    toast.success("Practice history cleared");
  };

  // Debug function to clear all progress data
  const handleClearAllProgress = async () => {
    const confirmed = window.confirm(
      "This will reset ALL word progress and streaks. Are you sure?"
    );

    if (!confirmed) return;

    const [, error] = await tryCatch(() => clearAllLexemeProgress());

    if (error) {
      console.error("Failed to clear progress:", error);
      toast.error("Failed to clear progress data");
      return;
    }

    // Reload the page to reset all state
    window.location.reload();
  };

  const flashCardControls = useFlashCard({
    isEnabled: isFlashCardMode,
    onMarkCorrect: currentLexeme
      ? async () => {
          setFeedbackAnimation("correct");
          setTimeout(async () => {
            await handleMarkCorrect(currentLexeme);
            await handleNext();
            setFeedbackAnimation(null);
          }, 600);
        }
      : undefined,

    onMarkIncorrect: currentLexeme
      ? async () => {
          setFeedbackAnimation("incorrect");
          setTimeout(async () => {
            await handleMarkIncorrect(currentLexeme, undefined);
            await handleNext();
            setFeedbackAnimation(null);
          }, 600);
        }
      : undefined,
  });

  if (isLoading || !currentLexeme) {
    return <div className="mt-16 text-center text-xl text-gray-600">Loading lexemes...</div>;
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Stats Sidebar - Desktop only */}
        <DashboardSidebar
          allLexemes={(lexemesData as LexemesData).learnedLexemes}
          progressMap={progressMap}
        />

        {/* Main Center Area */}
        <div className="relative flex-1 overflow-auto">
          {/* Card Container - Centered */}
          <div className="flex h-full items-center justify-center p-6">
            <div className="w-full max-w-2xl space-y-4">
              {/* Debug Controls */}
              {process.env.NODE_ENV === "development" && (
                <div className="mb-4 flex justify-center gap-2">
                  <button
                    onClick={handleClearAllProgress}
                    className="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
                  >
                    Reset All Progress (Dev)
                  </button>
                </div>
              )}

              {/* Practice Mode Toggles */}
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleToggleReverseMode}
                  className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <span className="text-muted-foreground">Mode:</span>
                  <span className="font-semibold">
                    {isReverseMode ? "English → Indonesian" : "Indonesian → English"}
                  </span>
                  <span className="text-xs text-muted-foreground">(click to switch)</span>
                </button>

                <button
                  onClick={handleToggleFlashCardMode}
                  className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <span className="text-muted-foreground">Card Type:</span>
                  <span className="font-semibold">
                    {isFlashCardMode ? "Flash Cards" : "Writing Practice"}
                  </span>
                  <span className="text-xs text-muted-foreground">(click to switch)</span>
                </button>
              </div>

              {/* Main Card - Conditional Rendering */}
              {isFlashCardMode ? (
                <FlashCard
                  lexeme={currentLexeme}
                  isReverseMode={isReverseMode}
                  isFlipped={flashCardControls.isFlipped}
                  isAnimating={flashCardControls.isAnimating}
                  onFlip={flashCardControls.flip}
                  onCorrect={async () => {
                    await handleMarkCorrect(currentLexeme);
                    flashCardControls.resetCard();
                    await handleNext();
                  }}
                  onIncorrect={async () => {
                    await handleMarkIncorrect(currentLexeme, undefined);
                    flashCardControls.resetCard();
                    await handleNext();
                  }}
                  onMarkAsMastered={() => handleMarkAsMastered(currentLexeme)}
                  progress={getProgress(currentLexeme.text)}
                  showKeyboardHints={true}
                  feedbackAnimation={feedbackAnimation}
                  onAnimationComplete={() => setFeedbackAnimation(null)}
                />
              ) : (
                <ModernWordCard
                  lexeme={currentLexeme}
                  isReverseMode={isReverseMode}
                  onCorrect={() => handleMarkCorrect(currentLexeme)}
                  onIncorrect={(userAnswer) => handleMarkIncorrect(currentLexeme, userAnswer)}
                  onNext={() => handleNext()}
                  onMarkAsMastered={() => handleMarkAsMastered(currentLexeme)}
                  progress={getProgress(currentLexeme.text)}
                />
              )}
            </div>
          </div>
        </div>

        {/* History Sidebar - Hidden on mobile */}
        <aside className="hidden h-full w-80 lg:block">
          <PracticeHistory history={practiceHistory} onClear={handleClearHistory} />
        </aside>
      </div>

      {/* Mobile Stats Sheet - Only on mobile/tablet */}
      <MobileStatsSheet
        allLexemes={(lexemesData as LexemesData).learnedLexemes}
        progressMap={progressMap}
      />

      <Toaster
        position="top-right"
        toastOptions={{
          classNames: {
            toast: "bg-background border-border shadow-lg",
            title: "text-foreground",
            description: "text-muted-foreground",
            success: "bg-background border-green-200 dark:border-green-800",
            error: "bg-background border-red-200 dark:border-red-800",
            warning: "bg-background border-yellow-200 dark:border-yellow-800",
            info: "bg-background border-blue-200 dark:border-blue-800",
          },
        }}
      />
    </Layout>
  );
};

export default AppContent;
