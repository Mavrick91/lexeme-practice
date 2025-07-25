import { DashboardStats } from "./DashboardStats";
import type { Lexeme, LexemeProgress } from "@/types";

type DashboardSidebarProps = {
  allLexemes: Lexeme[];
  progressMap: Map<string, LexemeProgress>;
  accuracy?: number;
};

export const DashboardSidebar = ({ allLexemes, progressMap, accuracy }: DashboardSidebarProps) => {
  return (
    <aside className="hidden w-96 overflow-y-auto border-r bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:block">
      <div className="sticky top-0">
        <h2 className="mb-4 text-lg font-semibold">Progress Overview</h2>
        <DashboardStats allLexemes={allLexemes} progressMap={progressMap} accuracy={accuracy} />
      </div>
    </aside>
  );
};
