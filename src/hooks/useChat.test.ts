import { renderHook, act, waitFor } from "@testing-library/react";
import { useChat } from "./useChat";
import { chatCompletion } from "@/lib/openai";
import { getChatConversation, saveChatConversation } from "@/db";
import { toast } from "sonner";

// Mock dependencies
jest.mock("@/lib/openai");
jest.mock("@/db");
jest.mock("sonner");

const mockChatCompletion = chatCompletion as jest.MockedFunction<typeof chatCompletion>;
const mockGetChatConversation = getChatConversation as jest.MockedFunction<
  typeof getChatConversation
>;
const mockSaveChatConversation = saveChatConversation as jest.MockedFunction<
  typeof saveChatConversation
>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe("useChat", () => {
  const mockSystemPrompt = "You are a helpful assistant.";
  const mockHistoryItemId = "test-item-123";

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock crypto.randomUUID
    (globalThis as any).crypto = {
      randomUUID: jest.fn(() => `uuid-${Date.now()}`),
    };

    // Mock console methods
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("initializes with system message", () => {
    const { result } = renderHook(() => useChat(mockSystemPrompt));

    expect(result.current.messages).toHaveLength(0); // System messages are filtered out
    expect(result.current.isSending).toBe(false);
    expect(result.current.isLoading).toBe(false); // No historyItemId, so loading is false
  });

  it("loads existing conversation on mount", async () => {
    const mockConversation = {
      id: mockHistoryItemId,
      historyItemId: mockHistoryItemId,
      messages: [
        { id: "1", role: "system" as const, content: mockSystemPrompt, timestamp: 1 },
        { id: "2", role: "user" as const, content: "Hello", timestamp: 2 },
        { id: "3", role: "assistant" as const, content: "Hi there!", timestamp: 3 },
      ],
      lastUpdated: Date.now(),
    };

    mockGetChatConversation.mockResolvedValueOnce(mockConversation);

    const { result } = renderHook(() => useChat(mockSystemPrompt, mockHistoryItemId));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toHaveLength(2); // User and assistant messages
    expect(result.current.messages[0].content).toBe("Hello");
    expect(result.current.messages[1].content).toBe("Hi there!");
  });

  it("sends message and receives response", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      content: "I can help with that!",
    });

    const { result } = renderHook(() => useChat(mockSystemPrompt));

    await act(async () => {
      await result.current.sendMessage("Help me");
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages[0].role).toBe("user");
    expect(result.current.messages[0].content).toBe("Help me");
    expect(result.current.messages[1].role).toBe("assistant");
    expect(result.current.messages[1].content).toBe("I can help with that!");
  });

  it("handles race condition - does not overwrite new messages with old conversation", async () => {
    // Old conversation data
    const oldConversation = {
      id: mockHistoryItemId,
      historyItemId: mockHistoryItemId,
      messages: [
        { id: "1", role: "system" as const, content: mockSystemPrompt, timestamp: 1 },
        { id: "2", role: "user" as const, content: "Old message", timestamp: 2 },
        { id: "3", role: "assistant" as const, content: "Old response", timestamp: 3 },
      ],
      lastUpdated: Date.now() - 10000,
    };

    // Setup: Create promises we can control
    let resolveConversation: (value: typeof oldConversation) => void;
    let resolveChatCompletion: (value: { content: string }) => void;

    const conversationPromise = new Promise((resolve) => {
      resolveConversation = resolve;
    });

    const chatCompletionPromise = new Promise((resolve) => {
      resolveChatCompletion = resolve;
    });

    // Mock the async functions to return our controlled promises
    mockGetChatConversation.mockReturnValueOnce(
      conversationPromise as Promise<typeof oldConversation>
    );
    mockChatCompletion.mockReturnValueOnce(chatCompletionPromise as Promise<{ content: string }>);

    const { result } = renderHook(() => useChat(mockSystemPrompt, mockHistoryItemId));

    // While conversation is loading, send a new message
    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.sendMessage("New message");
    });

    // Resolve chat completion first (simulating fast API response)
    await act(async () => {
      resolveChatCompletion!({ content: "New response" });
    });

    // At this point, we should have the new messages
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].content).toBe("New message");
      expect(result.current.messages[1].content).toBe("New response");
    });

    // Now resolve the conversation load (simulating slow DB read)
    await act(async () => {
      resolveConversation!(oldConversation);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Messages should NOT be overwritten with old conversation
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].content).toBe("New message");
    expect(result.current.messages[1].content).toBe("New response");

    // Should see warning in console
    expect(console.warn).toHaveBeenCalledWith(
      "Skipping conversation load - newer messages already present"
    );
  });

  it("handles send message error", async () => {
    const mockError = new Error("API error");
    mockChatCompletion.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useChat(mockSystemPrompt));

    await act(async () => {
      await result.current.sendMessage("Test message");
    });

    expect(result.current.messages).toHaveLength(1); // Only user message
    expect(result.current.isSending).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith("Failed to get AI response. Please try again.");
  });

  it("resets conversation", () => {
    const { result } = renderHook(() => useChat(mockSystemPrompt));

    // Add some messages first
    act(() => {
      result.current.sendMessage("Test");
    });

    expect(result.current.messages).toHaveLength(1);

    // Reset
    act(() => {
      result.current.reset("New system prompt");
    });

    expect(result.current.messages).toHaveLength(0); // System message filtered out
    expect(result.current.isSending).toBe(false);
  });

  it("saves conversation after message updates", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      content: "Response",
    });

    const { result } = renderHook(() => useChat(mockSystemPrompt, mockHistoryItemId));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Send a message
    await act(async () => {
      await result.current.sendMessage("Test");
    });

    await waitFor(() => {
      expect(mockSaveChatConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockHistoryItemId,
          historyItemId: mockHistoryItemId,
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({ role: "user", content: "Test" }),
            expect.objectContaining({ role: "assistant", content: "Response" }),
          ]),
        })
      );
    });
  });

  it("does not save conversation during loading", async () => {
    // Keep loading state active
    mockGetChatConversation.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useChat(mockSystemPrompt, mockHistoryItemId));

    expect(result.current.isLoading).toBe(true);

    // Try to trigger a save by updating messages somehow
    // Since loading is true, save should not be called
    expect(mockSaveChatConversation).not.toHaveBeenCalled();
  });

  it("does not send empty messages", async () => {
    const { result } = renderHook(() => useChat(mockSystemPrompt));

    await act(async () => {
      await result.current.sendMessage("");
      await result.current.sendMessage("   ");
    });

    expect(result.current.messages).toHaveLength(0);
    expect(mockChatCompletion).not.toHaveBeenCalled();
  });

  it("prevents sending while already sending", async () => {
    // Make chat completion hang
    mockChatCompletion.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useChat(mockSystemPrompt));

    // Start sending
    act(() => {
      result.current.sendMessage("First message");
    });

    expect(result.current.isSending).toBe(true);

    // Try to send another
    act(() => {
      result.current.sendMessage("Second message");
    });

    // Should only have one user message
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("First message");
  });
});
