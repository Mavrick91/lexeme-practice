import { render, screen } from "@/test-utils";
import { MistakesList } from "./MistakesList";
import type { Lexeme, LexemeProgress } from "@/types";

const makeLexeme = (text: string, translations: string[] = ["t1"]) =>
  ({ text, translations }) as unknown as Lexeme;

const makeProgress = (
  text: string,
  timesSeen: number,
  timesCorrect: number,
  recentIncorrectStreak = 0
): LexemeProgress => ({
  text,
  timesSeen,
  timesCorrect,
  lastPracticedAt: Date.now(),
  recentIncorrectStreak,
  confusedWith: {},
  easingLevel: 1,
  consecutiveCorrectStreak: 0,
  isMastered: false,
});

describe("MistakesList", () => {
  it("renders empty state when there are no mistakes", () => {
    const allLexemes = [makeLexeme("a"), makeLexeme("b")];
    const progressMap = new Map<string, LexemeProgress>([
      ["a", makeProgress("a", 3, 3)],
      ["b", makeProgress("b", 0, 0)],
    ]);

    render(<MistakesList allLexemes={allLexemes} progressMap={progressMap} />);

    expect(screen.getByText("No mistakes yet!")).toBeInTheDocument();
  });

  it("lists mistakes sorted by incorrect count then recent streak", () => {
    const l1 = makeLexeme("alpha", ["one"]);
    const l2 = makeLexeme("beta", ["two"]);
    const l3 = makeLexeme("gamma", ["three"]);

    const progressMap = new Map<string, LexemeProgress>([
      ["alpha", makeProgress("alpha", 5, 2, 1)], // 3 incorrect, streak 1
      ["beta", makeProgress("beta", 6, 3, 2)], // 3 incorrect, streak 2 (before alpha)
      ["gamma", makeProgress("gamma", 4, 3, 0)], // 1 incorrect
    ]);

    render(<MistakesList allLexemes={[l1, l2, l3]} progressMap={progressMap} limit={10} />);

    const wordNodes = screen.getAllByText(/alpha|beta|gamma/);
    const wordsInOrder = wordNodes.map((n) => n.textContent);

    // Expect beta before alpha, and gamma somewhere after
    const betaIndex = wordsInOrder.indexOf("beta");
    const alphaIndex = wordsInOrder.indexOf("alpha");
    const gammaIndex = wordsInOrder.indexOf("gamma");

    expect(betaIndex).toBeGreaterThanOrEqual(0);
    expect(alphaIndex).toBeGreaterThanOrEqual(0);
    expect(gammaIndex).toBeGreaterThanOrEqual(0);
    expect(betaIndex).toBeLessThan(alphaIndex);
    expect(gammaIndex).toBeGreaterThan(alphaIndex);

    // Badge only shown when recentStreak > 0; ensure at least one streak badge exists
    expect(screen.getAllByText(/miss(es)?$/)[0].textContent).toMatch(/3/);
  });
});
