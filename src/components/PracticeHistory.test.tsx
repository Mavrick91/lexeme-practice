import { render, screen, fireEvent } from "@/test-utils";
import { PracticeHistory } from "./PracticeHistory";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import type { PracticeHistoryItem } from "@/types";

// Mock the ChatDrawer component
jest.mock("@/components/chat/ChatDrawer", () => ({
  ChatDrawer: jest.fn(() => null),
}));

describe("PracticeHistory", () => {
  const mockOnClear = jest.fn();

  // Helper to create history items
  const makeItem = (id: string, isCorrect: boolean): PracticeHistoryItem => ({
    id,
    word: `word-${id}`,
    translation: [`trans-${id}`, `meaning-${id}`],
    isCorrect,
    timestamp: Date.now(),
  });

  // Test data
  const EMPTY: PracticeHistoryItem[] = [];
  const MIXED: PracticeHistoryItem[] = [
    makeItem("1", true),
    makeItem("2", false),
    makeItem("3", true),
  ];
  const ALL_CORRECT: PracticeHistoryItem[] = [makeItem("4", true), makeItem("5", true)];
  const ALL_WRONG: PracticeHistoryItem[] = [makeItem("6", false), makeItem("7", false)];

  // Helper to render component
  const renderHistory = (history = MIXED, onClear = mockOnClear) => {
    return render(<PracticeHistory history={history} onClear={onClear} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when no history", () => {
    renderHistory(EMPTY);

    expect(screen.getByText("No words practiced yet")).toBeInTheDocument();
    expect(screen.getByText("Your practice history will appear here")).toBeInTheDocument();
    expect(screen.queryByTitle("Clear history")).not.toBeInTheDocument();
    // ChatDrawer is always rendered but with open={false}
    expect(ChatDrawer).toHaveBeenCalled();
    const lastCall = (ChatDrawer as jest.Mock).mock.calls[0][0];
    expect(lastCall).toMatchObject({
      open: false,
      item: null,
    });
  });

  it("renders history items with correct styling", () => {
    renderHistory(MIXED);

    // Check first item (correct)
    const word1 = screen.getByText("word-1");
    const item1Container = word1.closest(".rounded-lg");
    expect(item1Container).toHaveClass("bg-green-50");
    expect(item1Container).toHaveClass("border-green-200");

    // Check second item (incorrect)
    const word2 = screen.getByText("word-2");
    const item2Container = word2.closest(".rounded-lg");
    expect(item2Container).toHaveClass("bg-red-50");
    expect(item2Container).toHaveClass("border-red-200");

    // Check translations are displayed
    expect(screen.getByText("trans-1, meaning-1")).toBeInTheDocument();
    expect(screen.getByText("trans-2, meaning-2")).toBeInTheDocument();
  });

  it("calculates and displays statistics correctly", () => {
    renderHistory(MIXED);

    // Total items
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();

    // Accuracy (2 correct out of 3 = 67%)
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("Accuracy")).toBeInTheDocument();
  });

  it("displays 100% accuracy when all correct", () => {
    renderHistory(ALL_CORRECT);

    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("displays 0% accuracy when all wrong", () => {
    renderHistory(ALL_WRONG);

    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("shows clear button only when there are items", () => {
    const { rerender } = renderHistory(EMPTY);

    // No clear button when empty
    expect(screen.queryByTitle("Clear history")).not.toBeInTheDocument();

    // Clear button appears when items exist
    rerender(<PracticeHistory history={MIXED} onClear={mockOnClear} />);
    expect(screen.getByTitle("Clear history")).toBeInTheDocument();
  });

  it("calls onClear when clear button is clicked", () => {
    renderHistory(MIXED);

    const clearButton = screen.getByTitle("Clear history");
    fireEvent.click(clearButton);

    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  it("opens ChatDrawer with selected item when card is clicked", () => {
    renderHistory(MIXED);

    const cards = screen.getAllByTestId("history-card");
    fireEvent.click(cards[0]); // Click first card

    // Find the call where open is true and item matches
    const calls = (ChatDrawer as jest.Mock).mock.calls;
    const openCall = calls.find((call) => call[0].open === true && call[0].item?.id === "1");

    expect(openCall).toBeDefined();
    expect(openCall[0]).toMatchObject({
      open: true,
      item: MIXED[0],
    });
  });

  it("opens ChatDrawer for different items", () => {
    renderHistory(MIXED);

    const cards = screen.getAllByTestId("history-card");

    // Click second card
    fireEvent.click(cards[1]);

    // Find the call where open is true and item matches
    const calls = (ChatDrawer as jest.Mock).mock.calls;
    const openCall = calls.find((call) => call[0].open === true && call[0].item?.id === "2");

    expect(openCall).toBeDefined();
    expect(openCall[0]).toMatchObject({
      open: true,
      item: MIXED[1],
    });
  });

  it("displays footer with correct and incorrect counts", () => {
    renderHistory(MIXED);

    // Find footer section
    const footer = screen.getByText("2").closest(".border-t");
    expect(footer).toBeInTheDocument();

    // 2 correct (displayed with green icon)
    const correctCount = screen.getAllByText("2")[0]; // First "2" is in stats, second in footer
    expect(correctCount).toBeInTheDocument();

    // 1 incorrect
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("does not display footer when history is empty", () => {
    renderHistory(EMPTY);

    // No footer section
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders correctly with a long history", () => {
    const longHistory = Array.from(
      { length: 20 },
      (_, i) => makeItem(`${i}`, i % 3 !== 0) // Every 3rd item is incorrect
    );

    renderHistory(longHistory);

    // Should show all items
    expect(screen.getByText("word-0")).toBeInTheDocument();
    expect(screen.getByText("word-19")).toBeInTheDocument();

    // Check stats
    expect(screen.getByText("20")).toBeInTheDocument(); // Total
    expect(screen.getByText("65%")).toBeInTheDocument(); // 13 correct out of 20
  });

  it("can open and close ChatDrawer", () => {
    renderHistory(MIXED);

    // Initially drawer is closed
    const initialCall = (ChatDrawer as jest.Mock).mock.calls[0][0];
    expect(initialCall).toMatchObject({
      open: false,
    });

    // Open drawer
    const card = screen.getAllByTestId("history-card")[0];
    fireEvent.click(card);

    // Verify drawer was called with open=true
    const calls = (ChatDrawer as jest.Mock).mock.calls;
    const openCall = calls.find((call) => call[0].open === true);
    expect(openCall).toBeDefined();
  });

  it("displays correct icons for correct and incorrect items", () => {
    renderHistory(MIXED);

    // Check for check circles (2 correct items)
    const checkIcons = screen.getAllByTestId("check-icon");
    expect(checkIcons).toHaveLength(2);

    // Check for X circles (1 incorrect item)
    const xIcons = screen.getAllByTestId("x-icon");
    expect(xIcons).toHaveLength(1);
  });

  it("history cards have proper accessibility attributes", () => {
    renderHistory(MIXED);

    const cards = screen.getAllByTestId("history-card");

    // Check first card
    expect(cards[0]).toHaveAttribute("type", "button");
    expect(cards[0]).toHaveAttribute("aria-label", "Ask AI about word-1");

    // Check all cards are focusable
    cards.forEach((card) => {
      expect(card.tagName).toBe("BUTTON");
      expect(card).toHaveAttribute("type", "button");
    });
  });

  it("cards have hover and focus visual states", () => {
    renderHistory(MIXED);

    const cards = screen.getAllByTestId("history-card");

    // Check for hover class
    expect(cards[0]).toHaveClass("hover:opacity-90");

    // Check for focus-visible classes
    expect(cards[0]).toHaveClass("focus-visible:outline-none");
    expect(cards[0]).toHaveClass("focus-visible:ring-2");
    expect(cards[0]).toHaveClass("focus-visible:ring-ring");
  });

  it("entire card is clickable, not just the icon", () => {
    renderHistory(MIXED);

    const wordText = screen.getByText("word-1");

    // Click on the word text itself (not the icon)
    fireEvent.click(wordText);

    // Verify drawer opened
    const calls = (ChatDrawer as jest.Mock).mock.calls;
    const openCall = calls.find((call) => call[0].open === true && call[0].item?.id === "1");
    expect(openCall).toBeDefined();
  });
});
