import { POST } from "./route";
import { NextRequest } from "next/server";
import type { FetchLexemesRequest } from "@/types/api";

// Mock the constants
jest.mock("@/lib/constants", () => ({
  DUOLINGO_CONFIG: {
    userId: "testuser",
    jwtToken: "test-jwt-token",
    apiBaseUrl: "https://test-api.duolingo.com",
    learningLanguage: "es",
    fromLanguage: "en",
  },
  API_HEADERS: {
    Host: "test-api.duolingo.com",
    "content-type": "application/json",
    accept: "*/*",
  },
  PAGINATION: {
    defaultLimit: 50,
    maxLimit: 100,
    safetyLimit: 5000,
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe("fetch-lexemes API route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should successfully fetch lexemes with default parameters", async () => {
    const mockLexemesResponse = {
      learnedLexemes: [
        {
          text: "hola",
          translations: ["hello"],
          audioURL: "https://example.com/hola.mp3",
        },
        {
          text: "gracias",
          translations: ["thanks", "thank you"],
          audioURL: "https://example.com/gracias.mp3",
        },
      ],
      pagination: {
        totalLexemes: 100,
        nextStartIndex: 50,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLexemesResponse,
    });

    const requestBody: FetchLexemesRequest = {
      progressedSkills: [
        {
          skillId: { id: "skill1" },
          finishedLevels: 3,
          finishedSessions: 10,
        },
      ],
    };

    const request = new NextRequest("http://localhost:3000/api/fetch-lexemes", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockLexemesResponse);
    
    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://test-api.duolingo.com"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Cookie: "jwt_token=test-jwt-token",
        }),
        body: JSON.stringify({
          progressedSkills: requestBody.progressedSkills,
          lastTotalLexemeCount: 0,
        }),
      })
    );
  });

  it("should handle custom pagination parameters", async () => {
    const mockResponse = {
      learnedLexemes: [],
      pagination: {
        totalLexemes: 200,
        nextStartIndex: 100,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const requestBody: FetchLexemesRequest = {
      progressedSkills: [
        {
          skillId: { id: "skill2" },
          finishedLevels: 5,
          finishedSessions: 15,
        },
      ],
      startIndex: 50,
      limit: 75,
      lastTotalLexemeCount: 200,
    };

    const request = new NextRequest("http://localhost:3000/api/fetch-lexemes", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockResponse);

    // Verify URL parameters
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchCall).toContain("startIndex=50");
    expect(fetchCall).toContain("limit=75");
    expect(fetchCall).toContain("sortBy=LEARNED_DATE");
  });

  it("should cap limit to maxLimit", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ learnedLexemes: [] }),
    });

    const requestBody: FetchLexemesRequest = {
      progressedSkills: [],
      limit: 200, // Exceeds maxLimit of 100
    };

    const request = new NextRequest("http://localhost:3000/api/fetch-lexemes", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    await POST(request);

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchCall).toContain("limit=100"); // Should be capped at maxLimit
  });

  it("should handle API errors gracefully", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const requestBody: FetchLexemesRequest = {
      progressedSkills: [],
    };

    const request = new NextRequest("http://localhost:3000/api/fetch-lexemes", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Failed to fetch lexemes",
      details: "Duolingo API responded with status: 401",
    });
  });

  it("should handle network errors", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network timeout"));

    const requestBody: FetchLexemesRequest = {
      progressedSkills: [],
    };

    const request = new NextRequest("http://localhost:3000/api/fetch-lexemes", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Failed to fetch lexemes",
      details: "Network timeout",
    });
  });

  it("should include proper headers in the request", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ learnedLexemes: [] }),
    });

    const requestBody: FetchLexemesRequest = {
      progressedSkills: [],
    };

    const request = new NextRequest("http://localhost:3000/api/fetch-lexemes", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    await POST(request);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-amzn-trace-id": "User=testuser",
          baggage: expect.stringContaining("sentry-environment=release"),
          "sentry-trace": expect.any(String),
        }),
      })
    );
  });
});