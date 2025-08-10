import { POST } from "./route";

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
}));

// Mock global fetch
(globalThis as any).fetch = jest.fn();

describe("fetch-user-progress API route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should successfully fetch user progress", async () => {
    const mockUserData = {
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
                  {
                    pathLevelMetadata: { skillId: "skill2" },
                    finishedSessions: 3,
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
              id: "legacy-skill1",
              finishedLevels: 2,
              finishedLessons: 8,
            },
          ],
        ],
      },
    };

    const mockBatchResponse = {
      responses: [
        {
          body: JSON.stringify(mockUserData),
          bodyCompressed: false,
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ],
    };

    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBatchResponse,
    });

    // Request parameter is not used by POST function

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.responses).toHaveLength(1);
    expect(data.responses[0].body).toEqual(mockUserData);

    // Verify fetch was called with batch endpoint
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://test-api.duolingo.com/batch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Cookie: "jwt_token=test-jwt-token",
          "x-amzn-trace-id": "User=testuser",
        }),
        body: expect.stringContaining("includeHeaders"),
      })
    );
  });

  it("should parse JSON string responses", async () => {
    const mockUserData = {
      currentCourse: {
        pathSectioned: [],
      },
    };

    const mockBatchResponse = {
      responses: [
        {
          body: JSON.stringify(mockUserData), // Body as string
          bodyCompressed: false,
        },
      ],
    };

    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBatchResponse,
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.responses[0].body).toEqual(mockUserData); // Should be parsed
  });

  it("should handle already parsed responses", async () => {
    const mockUserData = {
      currentCourse: {
        pathSectioned: [],
      },
    };

    const mockBatchResponse = {
      responses: [
        {
          body: mockUserData, // Already an object
          bodyCompressed: false,
        },
      ],
    };

    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBatchResponse,
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.responses[0].body).toEqual(mockUserData);
  });

  it("should keep invalid JSON as string", async () => {
    const invalidJson = "{ invalid json }";

    const mockBatchResponse = {
      responses: [
        {
          body: invalidJson,
          bodyCompressed: false,
        },
      ],
    };

    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBatchResponse,
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.responses[0].body).toBe(invalidJson); // Should remain as string
  });

  it("should handle API errors gracefully", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Failed to fetch user progress",
      details: "Duolingo API responded with status: 403",
    });
  });

  it("should handle network errors", async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error("Connection refused"));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Failed to fetch user progress",
      details: "Connection refused",
    });
  });

  it("should include proper batch request structure", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ responses: [] }),
    });

    await POST();

    const fetchBody = JSON.parse((globalThis.fetch as jest.Mock).mock.calls[0][1].body);

    expect(fetchBody).toHaveProperty("requests");
    expect(fetchBody.requests).toHaveLength(1);
    expect(fetchBody.requests[0]).toMatchObject({
      url: expect.stringContaining("/users/testuser"),
      method: "GET",
      body: "",
      extraHeaders: {},
    });
    expect(fetchBody.includeHeaders).toBe(true);
  });

  it("should include comprehensive field list in request", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ responses: [] }),
    });

    await POST();

    const fetchBody = JSON.parse((globalThis.fetch as jest.Mock).mock.calls[0][1].body);

    const requestUrl = fetchBody.requests[0].url;
    expect(requestUrl).toContain("fields=");
    expect(requestUrl).toContain("currentCourse");
    expect(requestUrl).toContain("pathSectioned");
    expect(requestUrl).toContain("skills");
    expect(requestUrl).toContain("finishedLevels");
    expect(requestUrl).toContain("finishedLessons");
  });

  it("should handle empty responses array", async () => {
    const mockBatchResponse = {
      responses: [],
    };

    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBatchResponse,
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.responses).toEqual([]);
  });

  it("should preserve additional response properties", async () => {
    const mockBatchResponse = {
      responses: [
        {
          body: "{}",
          bodyCompressed: true,
          compressionType: "gzip",
          headers: { "x-custom": "value" },
          status: 200,
        },
      ],
    };

    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBatchResponse,
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.responses[0]).toMatchObject({
      body: {},
      bodyCompressed: true,
      compressionType: "gzip",
      headers: { "x-custom": "value" },
      status: 200,
    });
  });
});
