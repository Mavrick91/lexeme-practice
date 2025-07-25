import { CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { PracticeHistoryItem } from "@/types";

type PracticeHistoryProps = {
  history: PracticeHistoryItem[];
  onClear: () => void;
};

export function PracticeHistory({ history, onClear }: PracticeHistoryProps) {
  const correctCount = history.filter((item) => item.isCorrect).length;
  const accuracy = history.length > 0 ? Math.round((correctCount / history.length) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">Practice History</h3>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="h-8 w-8"
              title="Clear history"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Stats */}
        {history.length > 0 && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted rounded-md p-2 text-center">
              <div className="font-medium">{history.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="bg-muted rounded-md p-2 text-center">
              <div className="font-medium">{accuracy}%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
          </div>
        )}
      </div>

      {/* History List */}
      <ScrollArea className="flex-1">
        {history.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p className="text-sm">No words practiced yet</p>
            <p className="text-xs mt-1">Your practice history will appear here</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  item.isCorrect
                    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                    : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                )}
              >
                <div className="flex items-start gap-2">
                  {item.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm break-words">{item.word}</div>
                    <div className="text-xs text-muted-foreground mt-1 break-words">
                      {item.translation.join(", ")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {history.length > 0 && (
        <div className="p-4 border-t bg-muted/30">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium">{correctCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="font-medium">{history.length - correctCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
