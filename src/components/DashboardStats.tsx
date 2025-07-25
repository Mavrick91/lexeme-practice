import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertCircle, Sparkles, Trophy, Target, TrendingUp } from "lucide-react";
import type { Lexeme, LexemeProgress } from "@/types";
import { getDueStatistics } from "@/lib/scheduler";

type DashboardStatsProps = {
  allLexemes: Lexeme[];
  progressMap: Map<string, LexemeProgress>;
  accuracy?: number;
};

export function DashboardStats({ allLexemes, progressMap, accuracy = 0 }: DashboardStatsProps) {
  const stats = getDueStatistics(allLexemes, progressMap);
  const practiceRate = Math.round((progressMap.size / stats.totalWords) * 100);

  const statCards = [
    {
      label: "Due Now",
      value: stats.dueNow,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950/20",
    },
    {
      label: "Due Soon",
      value: stats.dueSoon,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
    },
    {
      label: "New Words",
      value: stats.newWords,
      icon: Sparkles,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      label: "Mastered",
      value: stats.mastered,
      icon: Trophy,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/20",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Practice Progress</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {progressMap.size} / {stats.totalWords} words
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

      {/* Learning Tips */}
      {stats.dueNow > 20 && (
        <Card className="border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 text-orange-600" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                You have {stats.dueNow} words due for review!
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-200">
                Regular reviews help strengthen your memory. Try to review due words daily.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
