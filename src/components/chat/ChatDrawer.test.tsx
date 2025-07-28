import { render, screen } from "@/test-utils";
import { ChatDrawer } from "./ChatDrawer";
import { useChat } from "@/hooks/useChat";
import type { PracticeHistoryItem } from "@/types";
import type { ChatMessage } from "@/types/chat";

// Mock the useChat hook
jest.mock("@/hooks/useChat");

describe("ChatDrawer", () => {
  const mockOnOpenChange = jest.fn();
  const mockSendMessage = jest.fn();
  const mockReset = jest.fn();

  // Mock scrollIntoView
  beforeAll(() => {
    window.Element.prototype.scrollIntoView = jest.fn();
  });

  const defaultChatMock = {
    messages: [],
    isSending: false,
    isLoading: false,
    sendMessage: mockSendMessage,
    reset: mockReset,
  };

  const historyItem: PracticeHistoryItem = {
    id: "1",
    word: "casa",
    translation: ["house", "home"],
    isCorrect: true,
    timestamp: Date.now(),
  };

  const sampleMessages: ChatMessage[] = [
    {
      id: "msg-1",
      role: "user",
      content: "What does casa mean?",
      timestamp: Date.now(),
    },
    {
      id: "msg-2",
      role: "assistant",
      content: "Casa means house or home in Spanish.",
      timestamp: Date.now() + 1000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useChat as jest.Mock).mockReturnValue(defaultChatMock);
  });

  it("renders nothing when item is null", () => {
    const { container } = render(
      <ChatDrawer open={true} item={null} onOpenChange={mockOnOpenChange} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders drawer with title and translation when open", () => {
    render(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

    expect(screen.getByText('Ask about "casa"')).toBeInTheDocument();
    expect(screen.getByText("house, home")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(<ChatDrawer open={false} item={historyItem} onOpenChange={mockOnOpenChange} />);

    expect(screen.queryByText('Ask about "casa"')).not.toBeInTheDocument();
  });

  it("shows loading state", () => {
    (useChat as jest.Mock).mockReturnValue({
      ...defaultChatMock,
      isLoading: true,
    });

    render(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

    // Look for the Loader2 spinner by its class
    const spinner = screen.getByTestId("chat-loading");
    expect(spinner).toBeInTheDocument();
  });

  it("shows empty state when no messages", () => {
    (useChat as jest.Mock).mockReturnValue({
      ...defaultChatMock,
      isLoading: false,
      messages: [],
    });

    render(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

    expect(screen.getByText(/Ask me anything about this word/i)).toBeInTheDocument();
  });

  it("displays messages when they exist", () => {
    (useChat as jest.Mock).mockReturnValue({
      ...defaultChatMock,
      messages: sampleMessages,
    });

    render(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

    // ChatMessage component will render the content
    // We need to check if the messages are displayed
    expect(screen.getByText("What does casa mean?")).toBeInTheDocument();
    expect(screen.getByText("Casa means house or home in Spanish.")).toBeInTheDocument();
  });

  it("shows sending state", () => {
    (useChat as jest.Mock).mockReturnValue({
      ...defaultChatMock,
      isSending: true,
      messages: sampleMessages,
    });

    render(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

    // Look for the sending indicator
    const sendingIndicator = screen.getByTestId("chat-sending");
    expect(sendingIndicator).toBeInTheDocument();
  });

  it("disables input when sending", () => {
    (useChat as jest.Mock).mockReturnValue({
      ...defaultChatMock,
      isSending: true,
    });

    render(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

    const input = screen.getByPlaceholderText("Ask a question about this word...");
    expect(input).toBeDisabled();
  });

  it("resets chat when item changes", () => {
    const { rerender } = render(
      <ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />
    );

    const newItem: PracticeHistoryItem = {
      ...historyItem,
      id: "2",
      word: "perro",
      translation: ["dog"],
    };

    rerender(<ChatDrawer open={true} item={newItem} onOpenChange={mockOnOpenChange} />);

    expect(mockReset).toHaveBeenCalled();
  });

  it("initializes useChat with correct system prompt", () => {
    render(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

    expect(useChat).toHaveBeenCalledWith(
      expect.stringContaining(
        'You are an AI language tutor. The student is asking about the word "casa"'
      ),
      "1"
    );
  });

  it("shows and hides loading indicator correctly", () => {
    // Start with loading state
    (useChat as jest.Mock).mockReturnValue({
      ...defaultChatMock,
      isLoading: true,
    });

    const { rerender } = render(
      <ChatDrawer open={true} onOpenChange={mockOnOpenChange} item={historyItem} />
    );

    expect(screen.getByTestId("chat-loading")).toBeInTheDocument();

    // Simulate conversation loaded with messages
    (useChat as jest.Mock).mockReturnValue({
      ...defaultChatMock,
      isLoading: false,
      messages: sampleMessages,
    });

    rerender(<ChatDrawer open={true} onOpenChange={mockOnOpenChange} item={historyItem} />);

    expect(screen.queryByTestId("chat-loading")).not.toBeInTheDocument();
    expect(screen.getByText("What does casa mean?")).toBeInTheDocument();
    expect(screen.getByText("Casa means house or home in Spanish.")).toBeInTheDocument();
  });

  it("renders messages that are displayed in the chat", () => {
    (useChat as jest.Mock).mockReturnValue({
      ...defaultChatMock,
      messages: sampleMessages,
    });

    render(<ChatDrawer open={true} onOpenChange={mockOnOpenChange} item={historyItem} />);

    // Verify messages are rendered
    expect(screen.getByText("What does casa mean?")).toBeInTheDocument();
    expect(screen.getByText("Casa means house or home in Spanish.")).toBeInTheDocument();

    // The actual selectable text behavior is tested in ChatMessage.test.tsx
    // Here we just verify the messages are rendered correctly
  });
});
