import { useState, useEffect } from "react";
import { Layout } from "./components/Layout";
import { ModernWordCard } from "./components/ModernWordCard";
import { PracticeHistory } from "./components/PracticeHistory";
import { DashboardSidebar } from "./components/DashboardSidebar";
import { MobileStatsSheet } from "./components/MobileStatsSheet";
import { Button } from "./components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import { toast, Toaster } from "sonner";
import { Brain, Zap, AlertCircle, BookText } from "lucide-react";
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

// Constants for queue management
const QUEUE_SIZE = 50; // Number of words to fetch at once
const RECENT_LIMIT = 200; // Max words to track as "seen" before recycling

const AppContent = () => {
  const [practiceQueue, setPracticeQueue] = useState<Lexeme[]>([]);
  const [globalSeen, setGlobalSeen] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [practiceMode, setPracticeMode] = useState<"smart" | "new" | "all" | "mistakes">("smart");
  const [isLoading, setIsLoading] = useState(true);
  const [practiceHistory, setPracticeHistory] = useState<PracticeHistoryItem[]>([]);

  const { recordAnswer, getDueLexemes, getProgress, progressMap, getMistakePool } = useProgress();

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

  // Function to fill the practice queue
  const fillQueue = async (excludeSet: Set<string>): Promise<boolean> => {
    const data = lexemesData as LexemesData;
    let newLexemes: Lexeme[] = [];

    if (practiceMode === "smart") {
      // Use smart selection with spaced repetition
      newLexemes = getDueLexemes(data.learnedLexemes, QUEUE_SIZE, excludeSet);

      // If no lexemes returned and excludeSet is not empty, clear excludeSet and retry
      if (newLexemes.length === 0 && excludeSet.size > 0) {
        newLexemes = getDueLexemes(data.learnedLexemes, QUEUE_SIZE, new Set());
      }

      // Show appropriate feedback if still no words
      if (newLexemes.length === 0) {
        toast("All words reviewed! 🎉", {
          description:
            "Great job! All your words are up to date. Try practicing new words or switch to 'All Words' mode.",
          duration: 5000,
        });
      }
    } else if (practiceMode === "new") {
      // Only new words
      const allNewWords = data.learnedLexemes.filter((l) => l.isNew);
      // Filter out seen words
      newLexemes = allNewWords.filter((l) => !excludeSet.has(l.text)).slice(0, QUEUE_SIZE);

      // If not enough words and excludeSet is not empty, include some seen words
      if (newLexemes.length < QUEUE_SIZE && excludeSet.size > 0) {
        const additionalWords = allNewWords.slice(0, QUEUE_SIZE - newLexemes.length);
        newLexemes = [...newLexemes, ...additionalWords];
      }

      // Show feedback if no new words available
      if (newLexemes.length === 0 && allNewWords.length === 0) {
        toast("No new words available", {
          description:
            "You've already seen all the new words. Try 'Smart Review' or 'All Words' mode to continue practicing.",
          duration: 5000,
        });
      } else if (newLexemes.length === 0 && excludeSet.size > 0) {
        toast("All new words in this session completed!", {
          description: "Restarting with the new words from the beginning.",
          duration: 3000,
        });
      }
    } else if (practiceMode === "mistakes") {
      // Get mistake pool
      newLexemes = getMistakePool(data.learnedLexemes, QUEUE_SIZE);

      // Show feedback if no mistakes available
      if (newLexemes.length === 0) {
        toast("No mistakes to practice! 🎉", {
          description:
            "Great job! You haven't made any mistakes yet. Try other practice modes to continue learning.",
          duration: 5000,
        });
      }
    } else if (practiceMode === "all") {
      // All words in order
      const allWords = [...data.learnedLexemes];
      // Filter out seen words
      newLexemes = allWords.filter((l) => !excludeSet.has(l.text)).slice(0, QUEUE_SIZE);

      // If not enough words and excludeSet is not empty, include some seen words
      if (newLexemes.length < QUEUE_SIZE && excludeSet.size > 0) {
        const additionalWords = allWords.slice(0, QUEUE_SIZE - newLexemes.length);
        newLexemes = [...newLexemes, ...additionalWords];
      }

      // Show feedback when all words have been seen
      if (newLexemes.length === 0 && excludeSet.size >= allWords.length) {
        toast("All words practiced! 🎉", {
          description:
            "Excellent work! You've gone through all available words. Starting over from the beginning.",
          duration: 5000,
        });
      }
    }

    // Update practice queue
    setPracticeQueue(newLexemes);
    setIsLoading(false);

    // Return false if no lexemes available even after retry
    return newLexemes.length > 0;
  };

  // Handle mode changes
  useEffect(() => {
    // Clear globalSeen when mode changes
    setGlobalSeen(new Set());
    setCurrentIndex(0);

    // Call fillQueue with empty set
    fillQueue(new Set());
  }, [practiceMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = async () => {
    // Add current word to globalSeen
    const currentWord = practiceQueue[currentIndex].text;
    setGlobalSeen((prev) => {
      const newSeen = new Set(prev);
      newSeen.add(currentWord);

      // If globalSeen.size > RECENT_LIMIT, remove oldest entries
      if (newSeen.size > RECENT_LIMIT) {
        const seenArray = Array.from(newSeen);
        const toRemove = seenArray.slice(0, newSeen.size - RECENT_LIMIT);
        toRemove.forEach((word) => newSeen.delete(word));
      }

      return newSeen;
    });

    // If at the end of queue, try to fill more
    if (currentIndex >= practiceQueue.length - 1) {
      const hasMore = await fillQueue(globalSeen);

      if (!hasMore) {
        // No more words available, but keep the last word displayed
        toast("Session complete! 🎉", {
          description:
            "You've completed all available words for this mode. Switch modes to continue practicing or take a well-deserved break!",
          duration: 6000,
        });
        return;
      }

      // Reset to beginning of new queue
      setCurrentIndex(0);
    } else {
      // Otherwise just increment
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleMarkCorrect = async () => {
    const currentLexeme = practiceQueue[currentIndex];

    setCorrectAnswers(correctAnswers + 1);
    setTotalAnswers(totalAnswers + 1);

    // Add to practice history
    const historyItem: PracticeHistoryItem = {
      id: `${Date.now()}-${Math.random()}`,
      word: currentLexeme.text,
      translation: currentLexeme.translations,
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

    // Record answer with response time for SM-2 algorithm
    recordAnswer(currentLexeme, true);
  };

  const handleMarkIncorrect = async (userAnswer?: string) => {
    const currentLexeme = practiceQueue[currentIndex];

    setTotalAnswers(totalAnswers + 1);

    // Add to practice history
    const historyItem: PracticeHistoryItem = {
      id: `${Date.now()}-${Math.random()}`,
      word: currentLexeme.text,
      translation: currentLexeme.translations,
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
    recordAnswer(currentLexeme, false, userAnswer);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setCorrectAnswers(0);
    setTotalAnswers(0);
    setPracticeHistory([]);
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

  if (isLoading) {
    return <div className="mt-16 text-center text-xl text-gray-600">Loading lexemes...</div>;
  }

  if (practiceQueue.length === 0) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="max-w-md space-y-4 text-center">
          <h2 className="text-2xl font-semibold text-gray-700">No words available</h2>
          <p className="text-gray-600">
            {practiceMode === "smart" &&
              "All your words are up to date! Great job keeping up with your reviews."}
            {practiceMode === "new" && "You've already seen all the new words. Well done!"}
            {practiceMode === "all" && "Something went wrong loading the words."}
            {practiceMode === "mistakes" && "No mistakes to review. Keep up the great work!"}
          </p>
          <p className="text-sm text-gray-500">
            Try switching to a different practice mode using the buttons above.
          </p>
        </div>
      </div>
    );
  }

  const currentLexeme = practiceQueue[currentIndex];

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Stats Sidebar - Desktop only */}
        <DashboardSidebar
          allLexemes={(lexemesData as LexemesData).learnedLexemes}
          progressMap={progressMap}
          accuracy={totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0}
          sessionWordsSeen={globalSeen.size}
          currentQueueSize={practiceQueue.length - currentIndex - 1}
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
                  value && setPracticeMode(value as "smart" | "new" | "all" | "mistakes")
                }
                className="gap-2"
              >
                <ToggleGroupItem value="smart" className="gap-2">
                  <Brain className="h-4 w-4" />
                  Smart Review
                </ToggleGroupItem>
                <ToggleGroupItem value="new" className="gap-2">
                  <Zap className="h-4 w-4" />
                  New Only
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
                onCorrect={handleMarkCorrect}
                onIncorrect={handleMarkIncorrect}
                onNext={handleNext}
                currentIndex={currentIndex}
                totalWords={practiceQueue.length}
                progress={getProgress(currentLexeme.text)}
              />

              {/* Session Stats */}
              {totalAnswers > 0 && (
                <div className="mt-8 flex justify-center">
                  <Button onClick={handleReset} variant="outline" size="sm">
                    Reset Session
                  </Button>
                </div>
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
        accuracy={totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0}
        sessionWordsSeen={globalSeen.size}
        currentQueueSize={practiceQueue.length - currentIndex - 1}
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
