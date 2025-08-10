import { render, screen, fireEvent, waitFor } from "@/test-utils";
import { WordsTable } from "./WordsTable";
import type { Lexeme } from "@/types";
import { toast } from "sonner";

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/words",
}));

// Mock fetch globally
(globalThis as any).fetch = jest.fn();

// Mock window.location.reload properly
if (!window.location || typeof window.location.reload !== "function") {
  Object.defineProperty(window, "location", {
    writable: true,
    value: { reload: jest.fn() },
  });
}

describe("WordsTable", () => {
  const mockLexemes: Lexeme[] = [
    {
      text: "makan",
      translations: ["eat", "food"],
      audioURL: "https://example.com/audio1.mp3",
    },
    {
      text: "minum",
      translations: ["drink"],
      audioURL: "https://example.com/audio2.mp3",
    },
    {
      text: "buku",
      translations: ["book"],
      audioURL: "https://example.com/audio3.mp3",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    (globalThis.fetch as jest.Mock).mockReset();
    // Reset fetch to be a fresh mock
    (globalThis as any).fetch = jest.fn();
    // Ensure window.location.reload is a mock
    if (
      window.location &&
      window.location.reload &&
      typeof (window.location.reload as any).mockClear === "function"
    ) {
      (window.location.reload as jest.Mock).mockClear();
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should render the table with all lexemes", () => {
      render(<WordsTable lexemes={mockLexemes} />);

      expect(screen.getByText("makan")).toBeInTheDocument();
      expect(screen.getByText("minum")).toBeInTheDocument();
      expect(screen.getByText("buku")).toBeInTheDocument();
      expect(screen.getByText("eat, food")).toBeInTheDocument();
      expect(screen.getByText("drink")).toBeInTheDocument();
      expect(screen.getByText("book")).toBeInTheDocument();
    });

    it("should display the correct count badge", () => {
      render(<WordsTable lexemes={mockLexemes} />);

      const badge = screen.getByLabelText("Showing 3 out of 3 results");
      expect(badge).toHaveTextContent("3 / 3");
    });

    it("should display empty state when no lexemes", () => {
      render(<WordsTable lexemes={[]} />);

      expect(screen.getByText("No results")).toBeInTheDocument();
    });
  });

  describe("Search functionality", () => {
    it("should filter lexemes by word text", () => {
      render(<WordsTable lexemes={mockLexemes} />);

      const searchInput = screen.getByPlaceholderText("Search words or translations...");
      fireEvent.change(searchInput, { target: { value: "mak" } });

      expect(screen.getByText("makan")).toBeInTheDocument();
      expect(screen.queryByText("minum")).not.toBeInTheDocument();
      expect(screen.queryByText("buku")).not.toBeInTheDocument();
    });

    it("should filter lexemes by translation", () => {
      render(<WordsTable lexemes={mockLexemes} />);

      const searchInput = screen.getByPlaceholderText("Search words or translations...");
      fireEvent.change(searchInput, { target: { value: "drink" } });

      expect(screen.queryByText("makan")).not.toBeInTheDocument();
      expect(screen.getByText("minum")).toBeInTheDocument();
      expect(screen.queryByText("buku")).not.toBeInTheDocument();
    });

    it("should be case insensitive", () => {
      render(<WordsTable lexemes={mockLexemes} />);

      const searchInput = screen.getByPlaceholderText("Search words or translations...");
      fireEvent.change(searchInput, { target: { value: "BOOK" } });

      expect(screen.getByText("buku")).toBeInTheDocument();
      expect(screen.queryByText("makan")).not.toBeInTheDocument();
    });

    it("should update the count badge when filtering", () => {
      render(<WordsTable lexemes={mockLexemes} />);

      const searchInput = screen.getByPlaceholderText("Search words or translations...");
      fireEvent.change(searchInput, { target: { value: "m" } });

      const badge = screen.getByLabelText("Showing 2 out of 3 results");
      expect(badge).toHaveTextContent("2 / 3");
    });

    it("should show no results message when search has no matches", () => {
      render(<WordsTable lexemes={mockLexemes} />);

      const searchInput = screen.getByPlaceholderText("Search words or translations...");
      fireEvent.change(searchInput, { target: { value: "xyz" } });

      expect(screen.getByText("No results")).toBeInTheDocument();
    });
  });

  describe("Audio playback", () => {
    let mockAudio: {
      play: jest.Mock;
      pause: jest.Mock;
      paused: boolean;
      src: string;
      currentTime: number;
      onended: (() => void) | null;
    };

    beforeEach(() => {
      mockAudio = {
        play: jest.fn().mockResolvedValue(undefined),
        pause: jest.fn(),
        paused: false,
        src: "",
        currentTime: 0,
        onended: null,
      };

      (globalThis as any).Audio = jest.fn(() => mockAudio);
    });

    it("should play audio when play button is clicked", async () => {
      render(<WordsTable lexemes={mockLexemes} />);

      const playButton = screen.getByLabelText("Play audio for makan");
      fireEvent.click(playButton);

      await waitFor(() => {
        expect(mockAudio.play).toHaveBeenCalled();
        expect(mockAudio.src).toBe("https://example.com/audio1.mp3");
      });
    });

    it("should pause audio when clicking play on a playing item", async () => {
      render(<WordsTable lexemes={mockLexemes} />);

      const playButton = screen.getByLabelText("Play audio for makan");

      // First click to play
      fireEvent.click(playButton);
      await waitFor(() => {
        expect(mockAudio.play).toHaveBeenCalled();
      });

      // Second click to pause
      mockAudio.paused = false;
      fireEvent.click(playButton);

      expect(mockAudio.pause).toHaveBeenCalled();
    });

    it("should update button text to Pause when playing", async () => {
      render(<WordsTable lexemes={mockLexemes} />);

      const playButton = screen.getByLabelText("Play audio for makan");
      fireEvent.click(playButton);

      await waitFor(() => {
        expect(screen.getByLabelText("Pause audio for makan")).toHaveTextContent("Pause");
      });
    });
  });

  describe("Sync with Duolingo", () => {
    it.skip("should handle successful sync", async () => {
      const mockProgressResponse = {
        responses: [
          {
            body: {
              currentCourse: {
                pathSectioned: [
                  {
                    units: [
                      {
                        levels: [
                          {
                            pathLevelMetadata: { skillId: "skill1" },
                            finishedSessions: 5,
                            state: "completed",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      };

      const mockLexemesResponse = {
        learnedLexemes: [
          {
            text: "new",
            translations: ["baru"],
            audioURL: "https://example.com/new.mp3",
          },
        ],
        pagination: {
          totalLexemes: 1,
          nextStartIndex: null,
        },
      };

      const mockSaveResponse = {
        success: true,
        count: 4,
        message: "Successfully saved 4 lexemes (merged)",
      };

      (globalThis.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProgressResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLexemesResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSaveResponse,
        });

      render(<WordsTable lexemes={mockLexemes} />);

      const syncButton = screen.getByText("Fetch from Duolingo");
      fireEvent.click(syncButton);

      await waitFor(
        () => {
          expect(toast.info).toHaveBeenCalledWith("Fetching user progress...");
          expect(toast.success).toHaveBeenCalledWith(
            "Successfully fetched all 1 lexemes from Duolingo!"
          );
          expect(toast.success).toHaveBeenCalledWith("Successfully saved 4 lexemes (merged)!");
        },
        { timeout: 5000 }
      );
    }, 10000);

    it("should handle sync errors gracefully", async () => {
      (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      render(<WordsTable lexemes={mockLexemes} />);

      const syncButton = screen.getByText("Fetch from Duolingo");
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Network error");
      });
    });

    it("should handle no progressed skills", async () => {
      const mockProgressResponse = {
        responses: [
          {
            body: {
              currentCourse: {
                pathSectioned: [],
              },
            },
          },
        ],
      };

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgressResponse,
      });

      render(<WordsTable lexemes={mockLexemes} />);

      const syncButton = screen.getByText("Fetch from Duolingo");
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith("No progressed skills found");
      });
    });

    it("should disable sync button while syncing", async () => {
      (globalThis.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<WordsTable lexemes={mockLexemes} />);

      const syncButton = screen.getByText("Fetch from Duolingo");
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText("Fetching...")).toBeDisabled();
      });
    });

    it("should handle pagination correctly", async () => {
      const mockProgressResponse = {
        responses: [
          {
            body: {
              currentCourse: {
                pathSectioned: [
                  {
                    units: [
                      {
                        levels: [
                          {
                            pathLevelMetadata: { skillId: "skill1" },
                            finishedSessions: 5,
                            state: "completed",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      };

      const mockFirstBatch = {
        learnedLexemes: Array(50)
          .fill(null)
          .map((_, i) => ({
            text: `word${i}`,
            translations: [`translation${i}`],
            audioURL: `https://example.com/audio${i}.mp3`,
          })),
        pagination: {
          totalLexemes: 75,
          nextStartIndex: 50,
        },
      };

      const mockSecondBatch = {
        learnedLexemes: Array(25)
          .fill(null)
          .map((_, i) => ({
            text: `word${i + 50}`,
            translations: [`translation${i + 50}`],
            audioURL: `https://example.com/audio${i + 50}.mp3`,
          })),
        pagination: {
          totalLexemes: 75,
          nextStartIndex: null,
        },
      };

      (globalThis.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProgressResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFirstBatch,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSecondBatch,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, count: 75, message: "Success" }),
        });

      render(<WordsTable lexemes={mockLexemes} />);

      const syncButton = screen.getByText("Fetch from Duolingo");
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Successfully fetched all 75 lexemes from Duolingo!"
        );
      });

      // Verify that fetch was called for both batches
      expect(globalThis.fetch).toHaveBeenCalledTimes(4); // progress + 2 lexeme batches + save
    });
  });
});
