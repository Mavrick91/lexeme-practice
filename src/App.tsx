import { useState, useEffect } from "react";
import { Layout } from "./components/Layout";
import { ModernWordCard } from "./components/ModernWordCard";
import { PracticeHistory } from "./components/PracticeHistory";
import { DashboardSidebar } from "./components/DashboardSidebar";
import { MobileStatsSheet } from "./components/MobileStatsSheet";
import { Button } from "./components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import { toast, Toaster } from "sonner";
import { BookOpen, PenTool, Brain, Zap } from "lucide-react";
import { useProgress } from "./hooks/useProgress";
import type { LexemesData, Lexeme, PracticeHistoryItem } from "./types";
import lexemesData from "./combined_lexemes.json";
import { ThemeProvider } from "./contexts/ThemeContext";
import {
  getPracticeHistory,
  addPracticeHistoryItem,
  clearPracticeHistory as clearDBHistory,
  clearAllChatConversations,
} from "./db";
import { tryCatch } from "./lib/tryCatch";

function AppContent() {
  const [lexemes, setLexemes] = useState<Lexeme[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [practiceMode, setPracticeMode] = useState<"smart" | "new" | "all">("smart");
  const [learningMode, setLearningMode] = useState<"flashcard" | "writing">("writing");
  const [isLoading, setIsLoading] = useState(true);
  const [practiceHistory, setPracticeHistory] = useState<PracticeHistoryItem[]>([]);
  const [sessionHistory, setSessionHistory] = useState<Set<string>>(new Set());
  const [responseStartTime, setResponseStartTime] = useState<number>(Date.now());

  const { recordAnswer, getDueLexemes, getProgress, progressMap } = useProgress();

  // Load practice history from IndexedDB on mount
  useEffect(() => {
    const loadHistory = async () => {
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
    const data = lexemesData as LexemesData;
    let filteredLexemes: Lexeme[] = [];

    if (practiceMode === "smart") {
      // Use smart selection with spaced repetition
      filteredLexemes = getDueLexemes(data.learnedLexemes, 100, sessionHistory);
    } else if (practiceMode === "new") {
      // Only new words
      filteredLexemes = data.learnedLexemes.filter((l) => l.isNew);
    } else if (practiceMode === "all") {
      // All words in order
      filteredLexemes = [...data.learnedLexemes];
    }

    setLexemes(filteredLexemes);
    setIsLoading(false);
    setCurrentIndex(0);
    setResponseStartTime(Date.now());
  }, [practiceMode, getDueLexemes, sessionHistory]);

  const handleNext = () => {
    if (currentIndex < lexemes.length - 1) {
      // Add current word to session history
      const currentWord = lexemes[currentIndex].text;
      setSessionHistory((prev) => {
        const newHistory = new Set(prev);
        newHistory.add(currentWord);
        // Keep only last 10 words
        if (newHistory.size > 10) {
          const firstItem = newHistory.values().next().value;
          if (firstItem) {
            newHistory.delete(firstItem);
          }
        }
        return newHistory;
      });

      setCurrentIndex(currentIndex + 1);
      setResponseStartTime(Date.now()); // Reset timer for next word
    }
  };

  const handleMarkCorrect = async () => {
    const currentLexeme = lexemes[currentIndex];
    const responseTime = Date.now() - responseStartTime;

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
    recordAnswer(currentLexeme, true, responseTime);
    handleNext();
  };

  const handleMarkIncorrect = async () => {
    const currentLexeme = lexemes[currentIndex];
    const responseTime = Date.now() - responseStartTime;

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

    // Record answer with response time for SM-2 algorithm
    recordAnswer(currentLexeme, false, responseTime);
    handleNext();
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

  if (lexemes.length === 0) {
    return (
      <div className="mt-16 text-center text-xl text-gray-600">
        No lexemes found for the selected mode.
      </div>
    );
  }

  const currentLexeme = lexemes[currentIndex];

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Stats Sidebar - Desktop only */}
        <DashboardSidebar
          allLexemes={(lexemesData as LexemesData).learnedLexemes}
          progressMap={progressMap}
          accuracy={totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0}
        />

        {/* Main Center Area */}
        <div className="relative flex-1 overflow-auto">
          {/* Mode Selection - Fixed at top */}
          <div className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex flex-wrap justify-center gap-4">
              <ToggleGroup
                type="single"
                value={learningMode}
                onValueChange={(value) =>
                  value && setLearningMode(value as "flashcard" | "writing")
                }
                className="gap-2"
              >
                <ToggleGroupItem value="flashcard" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Flashcards
                </ToggleGroupItem>
                <ToggleGroupItem value="writing" className="gap-2">
                  <PenTool className="h-4 w-4" />
                  Writing
                </ToggleGroupItem>
              </ToggleGroup>

              <ToggleGroup
                type="single"
                value={practiceMode}
                onValueChange={(value) =>
                  value && setPracticeMode(value as "smart" | "new" | "all")
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
                  <BookOpen className="h-4 w-4" />
                  All Words
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
                mode={learningMode}
                onCorrect={handleMarkCorrect}
                onIncorrect={handleMarkIncorrect}
                onNext={handleNext}
                currentIndex={currentIndex}
                totalWords={lexemes.length}
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
      />

      <Toaster position="top-right" />
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
