// setupTests.ts
import "@testing-library/jest-dom";

// Mock window.matchMedia
// eslint-disable-next-line no-undef
global.matchMedia = jest.fn().mockImplementation((query) => ({
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
