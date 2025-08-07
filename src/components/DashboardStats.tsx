import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import type { Lexeme, LexemeProgress } from "@/types";
import { MistakesList } from "./MistakesList";

type DashboardStatsProps = {
  allLexemes: Lexeme[];
  progressMap: Map<string, LexemeProgress>;
};

export const DashboardStats = ({ allLexemes, progressMap }: DashboardStatsProps) => {
  // Calculate mastered words count
  const masteredCount = Array.from(progressMap.values()).filter((p) => p.isMastered).length;

  return (
    <div className="space-y-4">
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
