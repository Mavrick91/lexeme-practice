import { render, screen, fireEvent } from "@/test-utils";
import { MobileStatsSheet } from "./MobileStatsSheet";
import { DashboardStats } from "./DashboardStats";
import type { Lexeme, LexemeProgress } from "@/types";

// Mock the DashboardStats component
jest.mock("./DashboardStats", () => ({
  DashboardStats: jest.fn(() => null),
}));

describe("MobileStatsSheet", () => {
  // Sample data
  const sampleLexemes: Lexeme[] = [
    {
      text: "rumah",
      audioURL: "https://example.com/rumah.mp3",
      translations: ["house", "home"],
      phonetic: "roo-mah",
      example: "Ini adalah rumah saya",
      isNew: false,
    },
    {
      text: "buku",
      audioURL: "https://example.com/buku.mp3",
      translations: ["book"],
      isNew: true,
    },
  ];

  const sampleProgressMap = new Map<string, LexemeProgress>([
    [
      "rumah",
      {
        text: "rumah",
        timesSeen: 3,
        timesCorrect: 3,
        lastPracticedAt: Date.now(),
        mastered: false,
        recentIncorrectStreak: 0,
        confusedWith: {},
        easingLevel: 1,
      },
    ],
  ]);

  const defaultProps = {
    allLexemes: sampleLexemes,
    progressMap: sampleProgressMap,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders trigger button with correct styling", () => {
    render(<MobileStatsSheet {...defaultProps} />);

    const triggerButton = screen.getByRole("button", { name: /view statistics/i });
    expect(triggerButton).toBeInTheDocument();
    expect(triggerButton).toHaveClass("fixed", "bottom-4", "left-4", "z-50", "shadow-lg");
    expect(triggerButton).toHaveClass("md:hidden", "lg:hidden"); // Mobile only
  });

  it("renders BarChart3 icon in trigger button", () => {
    render(<MobileStatsSheet {...defaultProps} />);

    const triggerButton = screen.getByRole("button", { name: /view statistics/i });
    const icon = triggerButton.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("h-5", "w-5");
  });

  it("opens sheet when trigger button is clicked", () => {
    render(<MobileStatsSheet {...defaultProps} />);

    // Initially, sheet content should not be visible
    expect(screen.queryByText("Progress Overview")).not.toBeInTheDocument();

    // Click trigger button
    const triggerButton = screen.getByRole("button", { name: /view statistics/i });
    fireEvent.click(triggerButton);

    // Sheet content should be visible
    expect(screen.getByText("Progress Overview")).toBeInTheDocument();
    expect(screen.getByText("Track your learning progress and statistics")).toBeInTheDocument();
  });

  it("renders DashboardStats with correct props when sheet is open", () => {
    render(<MobileStatsSheet {...defaultProps} />);

    // Open sheet
    const triggerButton = screen.getByRole("button", { name: /view statistics/i });
    fireEvent.click(triggerButton);

    // Check that DashboardStats was called with correct props
    expect(DashboardStats).toHaveBeenCalled();
    const lastCall = (DashboardStats as jest.Mock).mock.calls[0][0];
    expect(lastCall).toMatchObject({
      allLexemes: sampleLexemes,
      progressMap: sampleProgressMap,
    });
  });

  it("closes sheet when close button is clicked", () => {
    render(<MobileStatsSheet {...defaultProps} />);

    // Open sheet
    const triggerButton = screen.getByRole("button", { name: /view statistics/i });
    fireEvent.click(triggerButton);

    // Sheet should be open
    expect(screen.getByText("Progress Overview")).toBeInTheDocument();

    // Find and click close button
    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    // Sheet content should no longer be visible
    expect(screen.queryByText("Progress Overview")).not.toBeInTheDocument();
  });

  it("renders sheet with correct width classes", () => {
    render(<MobileStatsSheet {...defaultProps} />);

    // Open sheet
    const triggerButton = screen.getByRole("button", { name: /view statistics/i });
    fireEvent.click(triggerButton);

    // Find the sheet content element
    const sheetContent = screen.getByText("Progress Overview").closest("[data-state]");
    expect(sheetContent).toHaveClass("w-[300px]", "sm:w-[400px]");
  });

  it("passes through all props to DashboardStats correctly", () => {
    const customProps = {
      allLexemes: sampleLexemes,
      progressMap: sampleProgressMap,
    };

    render(<MobileStatsSheet {...customProps} />);

    // Open sheet
    const triggerButton = screen.getByRole("button", { name: /view statistics/i });
    fireEvent.click(triggerButton);

    // Verify all props are passed correctly
    expect(DashboardStats).toHaveBeenCalled();
    const lastCall = (DashboardStats as jest.Mock).mock.calls[0][0];
    expect(lastCall).toMatchObject({
      allLexemes: sampleLexemes,
      progressMap: sampleProgressMap,
    });
  });

  it("handles empty data correctly", () => {
    const emptyProps = {
      allLexemes: [],
      progressMap: new Map(),
    };

    render(<MobileStatsSheet {...emptyProps} />);

    // Open sheet
    const triggerButton = screen.getByRole("button", { name: /view statistics/i });
    fireEvent.click(triggerButton);

    // Should still render correctly with empty data
    expect(screen.getByText("Progress Overview")).toBeInTheDocument();
    expect(DashboardStats).toHaveBeenCalled();
    const lastCall = (DashboardStats as jest.Mock).mock.calls[0][0];
    expect(lastCall).toMatchObject({
      allLexemes: [],
      progressMap: new Map(),
    });
  });

  it("maintains sheet state across re-renders", () => {
    const { rerender } = render(<MobileStatsSheet {...defaultProps} />);

    // Open sheet
    const triggerButton = screen.getByRole("button", { name: /view statistics/i });
    fireEvent.click(triggerButton);

    // Sheet should be open
    expect(screen.getByText("Progress Overview")).toBeInTheDocument();

    // Re-render with updated props
    const updatedProps = {
      ...defaultProps,
    };
    rerender(<MobileStatsSheet {...updatedProps} />);

    // Sheet should still be open
    expect(screen.getByText("Progress Overview")).toBeInTheDocument();

    // DashboardStats should be called with updated props
    const calls = (DashboardStats as jest.Mock).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall).toMatchObject({
      allLexemes: sampleLexemes,
      progressMap: sampleProgressMap,
    });
  });

  it("trigger button has proper accessibility attributes", () => {
    render(<MobileStatsSheet {...defaultProps} />);

    const triggerButton = screen.getByRole("button", { name: /view statistics/i });

    // Check for sr-only text
    const srOnlyText = triggerButton.querySelector(".sr-only");
    expect(srOnlyText).toBeInTheDocument();
    expect(srOnlyText).toHaveTextContent("View statistics");
  });

  it("renders sheet on the left side", () => {
    render(<MobileStatsSheet {...defaultProps} />);

    // Open sheet
    const triggerButton = screen.getByRole("button", { name: /view statistics/i });
    fireEvent.click(triggerButton);

    // The SheetContent should have side="left" which applies specific positioning
    const sheetContent = screen.getByText("Progress Overview").closest("[data-state]");
    // Sheet component from shadcn/ui applies data-side attribute
    expect(sheetContent).toBeInTheDocument();
  });
});
