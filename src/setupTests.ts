// setupTests.ts
import "@testing-library/jest-dom";

// Mock window.matchMedia
globalThis.matchMedia = jest.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(), // deprecated
  removeListener: jest.fn(), // deprecated
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// Mock modules that use import.meta
jest.mock("@/lib/openai", () => ({
  chatCompletion: jest.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: "Mocked response",
        },
      },
    ],
  }),
}));

jest.mock("@/db", () => ({
  getChatConversation: jest.fn().mockResolvedValue(null),
  saveChatConversation: jest.fn().mockResolvedValue(undefined),
}));

// Mock Next.js server components for testing
jest.mock("next/server", () => {
  // Using function expression instead of declaration to satisfy ESLint
  const NextRequest = function (
    this: { url: string; method: string; body: unknown; headers: Map<string, string> },
    url: string,
    init?: { method?: string; body?: unknown }
  ) {
    this.url = url;
    this.method = init?.method || "GET";
    this.body = init?.body;
    this.headers = new Map();
  };

  NextRequest.prototype.json = async function () {
    if (typeof this.body === "string") {
      return JSON.parse(this.body);
    }
    return this.body;
  };

  return {
    NextRequest: NextRequest as unknown,
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) => ({
        json: async () => body,
        status: init?.status || 200,
        ok: (init?.status || 200) < 400,
      }),
    },
  };
});

// Polyfill for URL in Node environment
if (typeof globalThis.URL === "undefined") {
  // Dynamic import for Node.js URL
  (globalThis as Record<string, unknown>).URL = globalThis.URL;
}
