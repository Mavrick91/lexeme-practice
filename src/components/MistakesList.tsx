import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingDown } from "lucide-react";
import type { Lexeme, LexemeProgress } from "@/types";

type MistakesListProps = {
  allLexemes: Lexeme[];
  progressMap: Map<string, LexemeProgress>;
  limit?: number;
};

export const MistakesList = ({ allLexemes, progressMap, limit = 10 }: MistakesListProps) => {
  const topMistakes = useMemo(() => {
    // Get lexemes with mistakes
    const mistakeLexemes = allLexemes
      .filter((lexeme) => {
        const progress = progressMap.get(lexeme.text);
        return progress && progress.timesSeen > progress.timesCorrect;
      })
      .map((lexeme) => {
        const progress = progressMap.get(lexeme.text)!;
        const timesIncorrect = progress.timesSeen - progress.timesCorrect;
        const accuracy = progress.timesSeen > 0 ? progress.timesCorrect / progress.timesSeen : 0;

        return {
          lexeme,
          progress,
          timesIncorrect,
          accuracy,
          recentStreak: progress.recentIncorrectStreak || 0,
        };
      })
      .sort((a, b) => {
        // Sort by incorrect count, then by recent streak
        if (b.timesIncorrect !== a.timesIncorrect) {
          return b.timesIncorrect - a.timesIncorrect;
        }
        return b.recentStreak - a.recentStreak;
      })
      .slice(0, limit);

    return mistakeLexemes;
  }, [allLexemes, progressMap, limit]);

  if (topMistakes.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center text-sm text-muted-foreground">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p>No mistakes yet!</p>
          <p className="mt-1 text-xs">Keep practicing to see your progress here.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <h3 className="font-semibold">Words to Focus On</h3>
      </div>

      <div className="space-y-2">
        {topMistakes.map(({ lexeme, timesIncorrect, accuracy, recentStreak }) => (
          <div
            key={lexeme.text}
            className="flex items-center justify-between rounded-lg border bg-card p-2 text-sm"
          >
            <div className="flex-1">
              <div className="font-medium">{lexeme.text}</div>
              <div className="text-xs text-muted-foreground">{lexeme.translations.join(", ")}</div>
            </div>

            <div className="flex items-center gap-2">
              {recentStreak > 0 && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <TrendingDown className="h-3 w-3" />
                  {recentStreak}
                </Badge>
              )}

              <div className="text-right">
                <div className="text-xs font-medium text-destructive">
                  {timesIncorrect} miss{timesIncorrect !== 1 ? "es" : ""}
                </div>
                <div className="text-xs text-muted-foreground">{Math.round(accuracy * 100)}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
