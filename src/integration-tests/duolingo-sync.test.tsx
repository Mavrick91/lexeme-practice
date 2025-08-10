/**
 * Integration test for the complete Duolingo sync flow
 * Tests the interaction between WordsTable, API routes, and data persistence
 */

import { render, screen, fireEvent, waitFor } from "@/test-utils";
import { WordsTable } from "@/components/WordsTable";
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

// Store fetch mock for assertions
const fetchMock = jest.fn();
global.fetch = fetchMock;

// Mock window.location.reload
delete (window as any).location;
window.location = { reload: jest.fn() } as any;
const reloadMock = window.location.reload as jest.Mock;

describe("Duolingo Sync Integration", () => {
  const initialLexemes: Lexeme[] = [
    {
      text: "existing",
      translations: ["ada"],
      audioURL: "https://example.com/existing.mp3",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockClear();
    reloadMock.mockClear();
  });

  describe("Complete successful sync flow", () => {
    it("should fetch progress, lexemes, save, and reload", async () => {
      // Setup mock responses for the complete flow
      const mockUserProgress = {
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
                            pathLevelMetadata: { skillId: "greetings" },
                            finishedSessions: 10,
                            state: "completed",
                          },
                          {
                            pathLevelMetadata: { skillId: "basics" },
                            finishedSessions: 5,
                            state: "started",
                          },
                        ],
                      },
                    ],
                  },
                ],
                skills: [
                  [
                    {
                      id: "food",
                      finishedLevels: 3,
                      finishedLessons: 12,
                    },
                  ],
                ],
              },
            },
          },
        ],
      };

      const mockLexemesBatch1 = {
        learnedLexemes: [
          { text: "halo", translations: ["hello"], audioURL: "https://example.com/halo.mp3" },
          { text: "selamat", translations: ["congratulations", "safe"], audioURL: "https://example.com/selamat.mp3" },
        ],
        pagination: {
          totalLexemes: 4,
          nextStartIndex: 2,
        },
      };

      const mockLexemesBatch2 = {
        learnedLexemes: [
          { text: "terima kasih", translations: ["thank you"], audioURL: "https://example.com/terima.mp3" },
          { text: "sama-sama", translations: ["you're welcome"], audioURL: "https://example.com/sama.mp3" },
        ],
        pagination: {
          totalLexemes: 4,
          nextStartIndex: null,
        },
      };

      const mockSaveResponse = {
        success: true,
        count: 5,
        message: "Successfully saved 5 lexemes (merged)",
      };

      // Setup fetch mock to return different responses based on URL
      fetchMock
        .mockImplementationOnce((url) => {
          expect(url).toBe("/api/fetch-user-progress");
          return Promise.resolve({
            ok: true,
            json: async () => mockUserProgress,
          });
        })
        .mockImplementationOnce((url) => {
          expect(url).toBe("/api/fetch-lexemes");
          return Promise.resolve({
            ok: true,
            json: async () => mockLexemesBatch1,
          });
        })
        .mockImplementationOnce((url) => {
          expect(url).toBe("/api/fetch-lexemes");
          return Promise.resolve({
            ok: true,
            json: async () => mockLexemesBatch2,
          });
        })
        .mockImplementationOnce((url) => {
          expect(url).toBe("/api/save-lexemes");
          return Promise.resolve({
            ok: true,
            json: async () => mockSaveResponse,
          });
        });

      render(<WordsTable lexemes={initialLexemes} />);

      // Click the sync button
      const syncButton = screen.getByText("Fetch from Duolingo");
      fireEvent.click(syncButton);

      // Verify the flow steps
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith("Fetching user progress...");
      });

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith("Fetching lexemes from Duolingo...");
      });

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith("Fetching lexemes: 2 / 4");
      });

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith("Fetching lexemes: 4 / 4");
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Successfully fetched all 4 lexemes from Duolingo!");
      });

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith("Saving lexemes to local file...");
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Successfully saved 5 lexemes (merged)!");
      });

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith("Refreshing page to show updated lexemes...");
      });

      // Wait for reload to be called
      await waitFor(() => {
        expect(reloadMock).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Verify all API calls were made
      expect(fetchMock).toHaveBeenCalledTimes(4);

      // Verify the skills were correctly extracted and sent
      const lexemeCall1 = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(lexemeCall1.progressedSkills).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            skillId: { id: "greetings" },
            finishedSessions: 10,
            finishedLevels: 1,
          }),
          expect.objectContaining({
            skillId: { id: "basics" },
            finishedSessions: 5,
            finishedLevels: 0,
          }),
          expect.objectContaining({
            skillId: { id: "food" },
            finishedSessions: 12,
            finishedLevels: 3,
          }),
        ])
      );

      // Verify pagination was handled correctly
      const lexemeCall2 = JSON.parse(fetchMock.mock.calls[2][1].body);
      expect(lexemeCall2.startIndex).toBe(2);
      expect(lexemeCall2.lastTotalLexemeCount).toBe(4);

      // Verify save was called with all lexemes
      const saveCall = JSON.parse(fetchMock.mock.calls[3][1].body);
      expect(saveCall.lexemes).toHaveLength(4);
      expect(saveCall.merge).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should handle user progress fetch failure", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      render(<WordsTable lexemes={initialLexemes} />);

      const syncButton = screen.getByText("Fetch from Duolingo");
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Network error");
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(reloadMock).not.toHaveBeenCalled();
    });

    it("should handle lexeme fetch failure", async () => {
      const mockUserProgress = {
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
                            pathLevelMetadata: { skillId: "test" },
                            finishedSessions: 1,
                            state: "started",
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

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserProgress,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

      render(<WordsTable lexemes={initialLexemes} />);

      const syncButton = screen.getByText("Fetch from Duolingo");
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to fetch lexemes at index 0");
      });

      expect(reloadMock).not.toHaveBeenCalled();
    });

    it("should handle save failure", async () => {
      const mockUserProgress = {
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
                            pathLevelMetadata: { skillId: "test" },
                            finishedSessions: 1,
                            state: "started",
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

      const mockLexemes = {
        learnedLexemes: [
          { text: "test", translations: ["test"], audioURL: "test.mp3" },
        ],
        pagination: { totalLexemes: 1, nextStartIndex: null },
      };

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserProgress,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLexemes,
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Save failed", details: "Disk full" }),
        });

      render(<WordsTable lexemes={initialLexemes} />);

      const syncButton = screen.getByText("Fetch from Duolingo");
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to save lexemes: Disk full");
      });

      expect(reloadMock).not.toHaveBeenCalled();
    });

    it("should handle compressed response error", async () => {
      const mockCompressedResponse = {
        responses: [
          {
            bodyCompressed: true,
            compressionType: "gzip",
            body: null,
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompressedResponse,
      });

      render(<WordsTable lexemes={initialLexemes} />);

      const syncButton = screen.getByText("Fetch from Duolingo");
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Server sent compressed response (gzip). Unable to process."
        );
      });

      expect(reloadMock).not.toHaveBeenCalled();
    });

    it("should handle empty skills gracefully", async () => {
      const mockEmptyProgress = {
        responses: [
          {
            body: {
              currentCourse: {
                pathSectioned: [],
                skills: [],
              },
            },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyProgress,
      });

      render(<WordsTable lexemes={initialLexemes} />);

      const syncButton = screen.getByText("Fetch from Duolingo");
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith("No progressed skills found");
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(reloadMock).not.toHaveBeenCalled();
    });
  });

  describe("UI state during sync", () => {
    it("should disable button and show correct text during different phases", async () => {
      // Setup a slow response to observe state changes
      let progressResolve: any;
      let lexemeResolve: any;
      let saveResolve: any;

      const progressPromise = new Promise((resolve) => {
        progressResolve = resolve;
      });

      const lexemePromise = new Promise((resolve) => {
        lexemeResolve = resolve;
      });

      const savePromise = new Promise((resolve) => {
        saveResolve = resolve;
      });

      fetchMock
        .mockImplementationOnce(() => progressPromise)
        .mockImplementationOnce(() => lexemePromise)
        .mockImplementationOnce(() => savePromise);

      render(<WordsTable lexemes={initialLexemes} />);

      const syncButton = screen.getByText("Fetch from Duolingo");
      expect(syncButton).not.toBeDisabled();

      fireEvent.click(syncButton);

      // Should show "Fetching..." and be disabled
      await waitFor(() => {
        expect(screen.getByText("Fetching...")).toBeDisabled();
      });

      // Resolve progress fetch
      progressResolve({
        ok: true,
        json: async () => ({
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
                              pathLevelMetadata: { skillId: "test" },
                              finishedSessions: 1,
                              state: "started",
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
        }),
      });

      // Still fetching
      await waitFor(() => {
        expect(screen.getByText("Fetching...")).toBeDisabled();
      });

      // Resolve lexemes fetch
      lexemeResolve({
        ok: true,
        json: async () => ({
          learnedLexemes: [{ text: "test", translations: ["test"], audioURL: "test.mp3" }],
          pagination: { totalLexemes: 1, nextStartIndex: null },
        }),
      });

      // Should switch to "Saving..."
      await waitFor(() => {
        expect(screen.getByText("Saving...")).toBeDisabled();
      });

      // Resolve save
      saveResolve({
        ok: true,
        json: async () => ({ success: true, count: 1, message: "Saved" }),
      });

      // Wait for completion
      await waitFor(() => {
        expect(reloadMock).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });
});