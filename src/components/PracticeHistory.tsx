import { useState } from "react";
import { CheckCircle2, XCircle, Trash2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { PracticeHistoryItem } from "@/types";
import { ChatDrawer } from "@/components/chat/ChatDrawer";

type PracticeHistoryProps = {
  history: PracticeHistoryItem[];
  onClear: () => void;
};

export const PracticeHistory = ({ history, onClear }: PracticeHistoryProps) => {
  const [selectedItem, setSelectedItem] = useState<PracticeHistoryItem | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const correctCount = history.filter((item) => item.isCorrect).length;
  const accuracy = history.length > 0 ? Math.round((correctCount / history.length) * 100) : 0;

  return (
    <div className="flex h-full flex-col border-l bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Practice History</h3>
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
            <div className="rounded-md bg-muted p-2 text-center">
              <div className="font-medium">{history.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="rounded-md bg-muted p-2 text-center">
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
            <p className="mt-1 text-xs">Your practice history will appear here</p>
          </div>
        ) : (
          <div className="space-y-2 p-2">
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
                    <CheckCircle2
                      data-testid="check-icon"
                      className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400"
                    />
                  ) : (
                    <XCircle
                      data-testid="x-icon"
                      className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-sm font-medium">{item.word}</div>
                    <div className="mt-1 break-words text-xs text-muted-foreground">
                      {item.translation.join(", ")}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-8 w-8 shrink-0"
                    onClick={() => {
                      setSelectedItem(item);
                      setChatOpen(true);
                    }}
                    title="Ask AI about this word"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {history.length > 0 && (
        <div className="border-t bg-muted/30 p-4">
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

      {/* Chat Drawer */}
      <ChatDrawer open={chatOpen} onOpenChange={setChatOpen} item={selectedItem} />
    </div>
  );
};
