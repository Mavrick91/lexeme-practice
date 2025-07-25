import { useState, useEffect } from "react";
import { Layout } from "./components/Layout";
import { ModernWordCard } from "./components/ModernWordCard";
import { PracticeHistory } from "./components/PracticeHistory";
import { Button } from "./components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import { toast, Toaster } from "sonner";
import { BookOpen, PenTool, Shuffle, Brain, Zap } from "lucide-react";
import { useProgress } from "./hooks/useProgress";
import type { LexemesData, Lexeme, PracticeHistoryItem } from "./types";
import lexemesData from "./combined_lexemes.json";
import { ThemeProvider } from "./contexts/ThemeContext";
import {
  getPracticeHistory,
  addPracticeHistoryItem,
  clearPracticeHistory as clearDBHistory,
} from "./db";
import { tryCatch } from "./lib/tryCatch";

function AppContent() {
  const [lexemes, setLexemes] = useState<Lexeme[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [practiceMode, setPracticeMode] = useState<"all" | "new" | "random">("random");
  const [learningMode, setLearningMode] = useState<"flashcard" | "writing">("writing");
  const [isLoading, setIsLoading] = useState(true);
  const [practiceHistory, setPracticeHistory] = useState<PracticeHistoryItem[]>([]);

  const { recordAnswer } = useProgress();

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
    let filteredLexemes = data.learnedLexemes;

    if (practiceMode === "new") {
      filteredLexemes = data.learnedLexemes.filter((l) => l.isNew);
    } else if (practiceMode === "random") {
      filteredLexemes = [...data.learnedLexemes].sort(() => Math.random() - 0.5);
    }

    setLexemes(filteredLexemes);
    setIsLoading(false);
    setCurrentIndex(0);
  }, [practiceMode]);

  const handleNext = () => {
    if (currentIndex < lexemes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleMarkCorrect = async () => {
    const currentLexeme = lexemes[currentIndex];
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

    recordAnswer(currentLexeme, true);
    handleNext();
  };

  const handleMarkIncorrect = async () => {
    const currentLexeme = lexemes[currentIndex];
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

    recordAnswer(currentLexeme, false);
    handleNext();
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setCorrectAnswers(0);
    setTotalAnswers(0);
    setPracticeHistory([]);
  };

  const handleClearHistory = async () => {
    const [, error] = await tryCatch(() => clearDBHistory());

    if (error) {
      console.error("Failed to clear practice history:", error);
      toast.error("Failed to clear practice history");
      return;
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
    <Layout currentPage="practice">
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-4xl">
            {/* Mode Selection */}
            <div className="mb-8 flex flex-wrap justify-center gap-4">
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
                  value && setPracticeMode(value as "all" | "new" | "random")
                }
                className="gap-2"
              >
                <ToggleGroupItem value="all" className="gap-2">
                  <Brain className="h-4 w-4" />
                  All Words
                </ToggleGroupItem>
                <ToggleGroupItem value="new" className="gap-2">
                  <Zap className="h-4 w-4" />
                  New Only
                </ToggleGroupItem>
                <ToggleGroupItem value="random" className="gap-2">
                  <Shuffle className="h-4 w-4" />
                  Random
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Main Card */}
            <ModernWordCard
              lexeme={currentLexeme}
              mode={learningMode}
              onCorrect={handleMarkCorrect}
              onIncorrect={handleMarkIncorrect}
              onNext={handleNext}
              currentIndex={currentIndex}
              totalWords={lexemes.length}
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

        {/* History Sidebar - Hidden on mobile */}
        <aside className="hidden h-full w-80 lg:block">
          <PracticeHistory history={practiceHistory} onClear={handleClearHistory} />
        </aside>
      </div>

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
