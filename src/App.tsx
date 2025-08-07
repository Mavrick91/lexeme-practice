import { useState, useEffect, useCallback } from "react";
import { Layout } from "./components/Layout";
import { ModernWordCard } from "./components/ModernWordCard";
import { PracticeHistory } from "./components/PracticeHistory";
import { DashboardSidebar } from "./components/DashboardSidebar";
import { MobileStatsSheet } from "./components/MobileStatsSheet";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import { toast, Toaster } from "sonner";
import { Brain, AlertCircle, BookText } from "lucide-react";
import { useProgress } from "./hooks/useProgress";
import type { LexemesData, Lexeme, PracticeHistoryItem } from "./types";
import lexemesData from "./combined_lexemes.json";
import { ThemeProvider } from "./contexts/ThemeContext";
import {
  getPracticeHistory,
  addPracticeHistoryItem,
  clearPracticeHistory as clearDBHistory,
  clearAllChatConversations,
  getReadyDB,
} from "./db";
import { tryCatch } from "./lib/tryCatch";

// Queue constants removed – we now pick one random word at a time

const AppContent = () => {
  const [currentLexeme, setCurrentLexeme] = useState<Lexeme | null>(null);
  const [practiceMode, setPracticeMode] = useState<"smart" | "all" | "mistakes">("smart");
  const [isLoading, setIsLoading] = useState(true);
  const [practiceHistory, setPracticeHistory] = useState<PracticeHistoryItem[]>([]);

  const { recordAnswer, markAsMastered, getDueLexemes, getProgress, progressMap, getMistakePool } =
    useProgress();

  // Function to pick a random lexeme based on practice mode
  const pickRandomLexeme = useCallback(
    (mode: "smart" | "all" | "mistakes"): Lexeme | null => {
      const data = lexemesData as LexemesData;

      if (mode === "smart") {
        // For smart mode, get due lexemes and pick randomly
        const pool = getDueLexemes(data.learnedLexemes, 999999, new Set());
        if (pool.length === 0) {
          toast("All words reviewed! 🎉", {
            description:
              "Great job! All your words are up to date. Try switching to 'All Words' mode to continue practicing.",
            duration: 5000,
          });
          return null;
        }
        return pool[Math.floor(Math.random() * pool.length)];
      }

      if (mode === "mistakes") {
        // For mistakes mode, get mistake pool and pick randomly
        const pool = getMistakePool(data.learnedLexemes, 999999);
        if (pool.length === 0) {
          toast("No mistakes to practice! 🎉", {
            description:
              "Great job! You haven't made any mistakes yet. Try other practice modes to continue learning.",
            duration: 5000,
          });
          return null;
        }
        return pool[Math.floor(Math.random() * pool.length)];
      }

      // mode === "all" - pick from all non-mastered words
      const unmastered = data.learnedLexemes.filter((l) => !progressMap.get(l.text)?.isMastered);
      if (unmastered.length === 0) {
        toast("All words mastered! 🎉", {
          description:
            "Amazing! You've mastered all available words. Consider resetting your progress to practice again.",
          duration: 5000,
        });
        return null;
      }
      return unmastered[Math.floor(Math.random() * unmastered.length)];
    },
    [getDueLexemes, getMistakePool, progressMap]
  );

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

  useEffect(() => {
    const next = pickRandomLexeme(practiceMode);
    if (!next) {
      setIsLoading(false);
      return;
    }
    setCurrentLexeme(next);
    setIsLoading(false);
  }, [practiceMode, pickRandomLexeme]);

  const handleNext = async () => {
    const next = pickRandomLexeme(practiceMode);

    if (!next) {
      toast("Session complete! 🎉", {
        description:
          "You've completed all available words for this mode. Switch modes to continue practicing or take a break!",
        duration: 6000,
      });
      return;
    }

    setCurrentLexeme(next);
  };

  const handleMarkCorrect = async (lexeme: Lexeme) => {
    // Add to practice history
    const historyItem: PracticeHistoryItem = {
      id: `${Date.now()}-${Math.random()}`,
      word: lexeme.text,
      translation: lexeme.translations,
      isCorrect: true,
      timestamp: Date.now(),
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
      toast.success(`🎉 "${lexeme.text}" MASTERED!`, {
        description: "This word won't appear in practice anymore.",
        duration: 4000,
      });

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

    // Don't call handleNext here - let the user manually advance after review
    // This gives them time to review the correct answer
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
          {/* Mode Selection - Fixed at top */}
          <div className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex flex-wrap justify-center gap-4">
              <ToggleGroup
                type="single"
                value={practiceMode}
                onValueChange={(value) =>
                  value && setPracticeMode(value as "smart" | "all" | "mistakes")
                }
                className="gap-2"
              >
                <ToggleGroupItem value="smart" className="gap-2">
                  <Brain className="h-4 w-4" />
                  Smart Review
                </ToggleGroupItem>
                <ToggleGroupItem value="all" className="gap-2">
                  <BookText className="h-4 w-4" />
                  All Words
                </ToggleGroupItem>
                <ToggleGroupItem value="mistakes" className="gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Mistakes
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Card Container - Centered in remaining space */}
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-2xl">
              {/* Main Card */}
              <ModernWordCard
                lexeme={currentLexeme}
                onCorrect={() => handleMarkCorrect(currentLexeme)}
                onIncorrect={(userAnswer) => handleMarkIncorrect(currentLexeme, userAnswer)}
                onNext={handleNext}
                onMarkAsMastered={() => handleMarkAsMastered(currentLexeme)}
                progress={getProgress(currentLexeme.text)}
              />
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

      <Toaster position="top-right" />
    </Layout>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
