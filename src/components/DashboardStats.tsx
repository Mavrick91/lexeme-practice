import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Trophy } from "lucide-react";
import type { Lexeme, LexemeProgress } from "@/types";
import { MistakesList } from "./MistakesList";

type DashboardStatsProps = {
  allLexemes: Lexeme[];
  progressMap: Map<string, LexemeProgress>;
  accuracy?: number;
  sessionWordsSeen?: number;
  currentQueueSize?: number;
};

export const DashboardStats = ({
  allLexemes,
  progressMap,
  accuracy = 0,
  sessionWordsSeen = 0,
  currentQueueSize = 0,
}: DashboardStatsProps) => {
  const totalWords = allLexemes.length;
  const practiceRate = Math.round((progressMap.size / totalWords) * 100);

  // Calculate mastered words count
  const masteredCount = Array.from(progressMap.values()).filter((p) => p.isMastered).length;

  return (
    <div className="space-y-4">
      {/* Session Progress */}
      {sessionWordsSeen > 0 && (
        <Card className="border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Current Session</span>
            </div>
            <span className="text-sm font-medium text-blue-600">{sessionWordsSeen} words seen</span>
          </div>
          {currentQueueSize > 0 && (
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {currentQueueSize} words remaining in queue
            </p>
          )}
        </Card>
      )}

      {/* Progress Overview */}
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Overall Progress</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {progressMap.size} / {totalWords} words
          </span>
        </div>
        <Progress value={practiceRate} className="h-2" />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{practiceRate}% practiced</span>
          {accuracy > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>{Math.round(accuracy)}% accuracy</span>
            </div>
          )}
        </div>
      </Card>

      {/* Mastered Words Card */}
      {masteredCount > 0 && (
        <Card className="border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Mastered Words</span>
            </div>
            <span className="text-sm font-bold text-green-600">
              {masteredCount} {masteredCount === 1 ? "word" : "words"}
            </span>
          </div>
          <p className="mt-1 text-xs text-green-700 dark:text-green-300">
            5 correct answers in a row!
          </p>
        </Card>
      )}

      {/* Mistakes List */}
      <MistakesList allLexemes={allLexemes} progressMap={progressMap} limit={5} />
    </div>
  );
};
