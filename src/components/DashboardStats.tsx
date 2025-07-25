import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Trophy, Target, TrendingUp } from "lucide-react";
import type { Lexeme, LexemeProgress } from "@/types";

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

  // Calculate statistics
  let newWords = 0;
  let mastered = 0;

  allLexemes.forEach((lexeme) => {
    const progress = progressMap.get(lexeme.text);
    if (!progress && lexeme.isNew) {
      newWords++;
    } else if (progress?.mastered) {
      mastered++;
    }
  });

  const statCards = [
    {
      label: "New Words",
      value: newWords,
      icon: Sparkles,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      label: "Mastered",
      value: mastered,
      icon: Trophy,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/20",
    },
  ];

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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className={`p-4 transition-all hover:scale-105 ${stat.bgColor}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                </div>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
