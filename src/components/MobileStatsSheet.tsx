import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DashboardStats } from "./DashboardStats";
import type { Lexeme, LexemeProgress } from "@/types";

type MobileStatsSheetProps = {
  allLexemes: Lexeme[];
  progressMap: Map<string, LexemeProgress>;
  accuracy?: number;
  sessionWordsSeen?: number;
  currentQueueSize?: number;
};

export const MobileStatsSheet = ({
  allLexemes,
  progressMap,
  accuracy,
  sessionWordsSeen = 0,
  currentQueueSize = 0,
}: MobileStatsSheetProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 left-4 z-50 shadow-lg md:hidden lg:hidden"
        >
          <BarChart3 className="h-5 w-5" />
          <span className="sr-only">View statistics</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Progress Overview</SheetTitle>
          <SheetDescription>Track your learning progress and statistics</SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <DashboardStats
            allLexemes={allLexemes}
            progressMap={progressMap}
            accuracy={accuracy}
            sessionWordsSeen={sessionWordsSeen}
            currentQueueSize={currentQueueSize}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
