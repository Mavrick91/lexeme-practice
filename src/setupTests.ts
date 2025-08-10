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
jest.mock("next/server", () => ({
  NextRequest: class {
    constructor(url: string, init?: any) {
      this.url = url;
      this.method = init?.method || "GET";
      this.body = init?.body;
      this.headers = new Map();
    }
    async json() {
      if (typeof this.body === "string") {
        return JSON.parse(this.body);
      }
      return this.body;
    }
  },
  NextResponse: {
    json: (body: any, init?: any) => ({
      json: async () => body,
      status: init?.status || 200,
      ok: (init?.status || 200) < 400,
    }),
  },
}));

// Polyfill for URL in Node environment
if (typeof URL === "undefined") {
  global.URL = require("url").URL;
}
