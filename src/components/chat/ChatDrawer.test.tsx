import { render, screen, act } from "@/test-utils";
import { ChatDrawer } from "./ChatDrawer";
import { useChat } from "@/hooks/useChat";
import type { PracticeHistoryItem } from "@/types";
import type { ChatMessage } from "@/types/chat";

// Mock the useChat hook
jest.mock("@/hooks/useChat");

// Mock the openai functions
jest.mock("@/lib/openai", () => ({
  generateMnemonicImage: jest.fn(),
}));

// Mock toast
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
  },
}));

describe("ChatDrawer", () => {
  const mockOnOpenChange = jest.fn();
  const mockSendMessage = jest.fn();

  // Mock scrollIntoView
  beforeAll(() => {
    window.Element.prototype.scrollIntoView = jest.fn();
  });

  const mockAddAssistantMessage = jest.fn();

  const defaultChatMock = {
    messages: [],
    isSending: false,
    isLoading: false,
    sendMessage: mockSendMessage,
    addAssistantMessage: mockAddAssistantMessage,
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

  it("initializes useChat with correct system prompt", () => {
    render(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

    expect(useChat).toHaveBeenCalledWith(
      expect.stringContaining(
        'You are an AI language tutor. The student is asking about the word "casa"'
      ),
      "casa"
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

  describe("Image Generation Feature", () => {
    // Get references to the mocked modules
    let generateMnemonicImage: jest.MockedFunction<
      typeof import("@/lib/openai").generateMnemonicImage
    >;
    let toast: any;

    beforeEach(() => {
      jest.clearAllMocks();
      // Initialize the mocked functions
      generateMnemonicImage = jest.fn();
      toast = { error: jest.fn() } as any;

      // Update the mocked modules
      const openaiMock = jest.requireMock("@/lib/openai");
      openaiMock.generateMnemonicImage = generateMnemonicImage;
      const sonnerMock = jest.requireMock("sonner");
      sonnerMock.toast = toast;
    });

    it("shows generate image button after clicking 'Help me remember'", async () => {
      const { rerender } = render(
        <ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />
      );

      // Find and click the "Help me remember" button
      const helpButton = screen.getByRole("button", { name: /help me remember/i });
      expect(helpButton).toBeInTheDocument();

      // Simulate clicking the help button
      act(() => {
        helpButton.click();
      });

      // Verify sendMessage was called with the correct prompt and metadata
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining("Break down the Indonesian word"),
        {
          templateId: "memory-tips",
        }
      );

      // Simulate receiving a response
      const memoryTipResponse: ChatMessage = {
        id: "response-1",
        role: "assistant",
        content:
          "To remember 'casa', think of it like 'castle' - both start with 'ca' and are places where people live.",
        timestamp: Date.now(),
      };

      (useChat as jest.Mock).mockReturnValue({
        ...defaultChatMock,
        messages: [memoryTipResponse],
      });

      rerender(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

      // Check that the generate image button appears
      const generateButton = screen.getByRole("button", { name: /generate visual mnemonic/i });
      expect(generateButton).toBeInTheDocument();
    });

    it("shows loading indicator while generating image", async () => {
      // Mock a slow image generation
      let resolveGeneration: (value: string) => void;
      const generationPromise = new Promise<string>((resolve) => {
        resolveGeneration = resolve;
      });
      generateMnemonicImage.mockReturnValueOnce(generationPromise);

      // Set up the component with a memory tip response
      const memoryTipResponse: ChatMessage = {
        id: "response-1",
        role: "assistant",
        content: "To remember 'casa', think of a castle.",
        timestamp: Date.now(),
      };

      (useChat as jest.Mock).mockReturnValue({
        ...defaultChatMock,
        messages: [memoryTipResponse],
      });

      const { rerender } = render(
        <ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />
      );

      // Click "Help me remember"
      const helpButton = screen.getByRole("button", { name: /help me remember/i });
      act(() => {
        helpButton.click();
      });

      rerender(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

      const generateButton = screen.getByTestId("image-generate-btn");

      // Click to start generation
      act(() => {
        generateButton.click();
      });

      rerender(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

      // Check that loading indicator is shown
      expect(screen.getByTestId("image-loading")).toBeInTheDocument();
      expect(screen.getByText("Generating visual mnemonic...")).toBeInTheDocument();
      expect(screen.queryByTestId("image-generate-btn")).not.toBeInTheDocument();

      // Resolve the generation with a base64 data URL
      await act(async () => {
        resolveGeneration!(
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        );
      });

      // Verify the loading state is gone
      expect(screen.queryByTestId("image-loading")).not.toBeInTheDocument();
    });

    it("generates image when button is clicked", async () => {
      const mockImageDataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      generateMnemonicImage.mockResolvedValueOnce(mockImageDataUrl);

      // Set up the component with a memory tip response already received
      const memoryTipResponse: ChatMessage = {
        id: "response-1",
        role: "assistant",
        content: "To remember 'casa', think of a castle.",
        timestamp: Date.now(),
      };

      (useChat as jest.Mock).mockReturnValue({
        ...defaultChatMock,
        messages: [memoryTipResponse],
      });

      const { rerender } = render(
        <ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />
      );

      // First click "Help me remember" to enable the image button
      const helpButton = screen.getByRole("button", { name: /help me remember/i });
      act(() => {
        helpButton.click();
      });

      // Re-render to show the generate button
      rerender(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

      const generateButton = screen.getByRole("button", { name: /generate visual mnemonic/i });

      // Click the button and wait for all async operations to complete
      await act(async () => {
        generateButton.click();
        // Wait for promises to resolve
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(generateMnemonicImage).toHaveBeenCalledWith(
        "casa",
        ["house", "home"],
        "To remember 'casa', think of a castle.",
        "intermediate"
      );

      // Verify that addAssistantMessage was called with the image data URL
      expect(mockAddAssistantMessage).toHaveBeenCalledWith(
        "Here's a visual mnemonic to help you remember:",
        mockImageDataUrl
      );
    });

    it("shows error toast when image generation fails", async () => {
      // Mock console.error for this test to suppress expected error output
      const originalConsoleError = console.error;
      console.error = jest.fn();

      generateMnemonicImage.mockRejectedValueOnce(new Error("API error"));

      // Set up the component with a memory tip response
      const memoryTipResponse: ChatMessage = {
        id: "response-1",
        role: "assistant",
        content: "To remember 'casa', think of a castle.",
        timestamp: Date.now(),
      };

      (useChat as jest.Mock).mockReturnValue({
        ...defaultChatMock,
        messages: [memoryTipResponse],
      });

      const { rerender } = render(
        <ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />
      );

      // Click "Help me remember"
      const helpButton = screen.getByRole("button", { name: /help me remember/i });
      act(() => {
        helpButton.click();
      });

      rerender(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

      const generateButton = screen.getByRole("button", { name: /generate visual mnemonic/i });

      // Wrap the async operation in act
      await act(async () => {
        generateButton.click();
        // Wait for all promises to resolve
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(toast.error).toHaveBeenCalledWith("Failed to generate visual mnemonic");

      // Verify console.error was called with expected message
      expect(console.error).toHaveBeenCalledWith("Failed to generate image:", expect.any(Error));

      // Restore console.error
      console.error = originalConsoleError;
      expect(mockAddAssistantMessage).not.toHaveBeenCalled();
    });

    it("does not show generate button for other prompt templates", () => {
      render(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

      // Click a different prompt button (not "Help me remember")
      const examplesButton = screen.getByRole("button", { name: /give me examples/i });
      act(() => {
        examplesButton.click();
      });

      // Verify sendMessage was called without the memory-tips templateId
      expect(mockSendMessage).toHaveBeenCalledWith(expect.stringContaining("example sentences"), {
        templateId: "give-examples",
      });

      // Simulate receiving a response
      const exampleResponse: ChatMessage = {
        id: "response-2",
        role: "assistant",
        content: "Here are some examples with 'casa'...",
        timestamp: Date.now(),
      };

      (useChat as jest.Mock).mockReturnValue({
        ...defaultChatMock,
        messages: [exampleResponse],
      });

      const { rerender } = render(
        <ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />
      );
      rerender(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

      // Verify the generate image button does NOT appear
      const generateButton = screen.queryByRole("button", { name: /generate visual mnemonic/i });
      expect(generateButton).not.toBeInTheDocument();
    });

    it("resets image generation state when drawer closes", () => {
      const memoryTipResponse: ChatMessage = {
        id: "response-1",
        role: "assistant",
        content: "Memory tip for casa",
        timestamp: Date.now(),
      };

      (useChat as jest.Mock).mockReturnValue({
        ...defaultChatMock,
        messages: [memoryTipResponse],
      });

      const { rerender } = render(
        <ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />
      );

      // Click help button to show generate button
      const helpButton = screen.getByRole("button", { name: /help me remember/i });
      act(() => {
        helpButton.click();
      });

      rerender(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByRole("button", { name: /generate visual mnemonic/i })).toBeInTheDocument();

      // Close the drawer
      rerender(<ChatDrawer open={false} item={historyItem} onOpenChange={mockOnOpenChange} />);

      // Re-open the drawer
      rerender(<ChatDrawer open={true} item={historyItem} onOpenChange={mockOnOpenChange} />);

      // The generate button should not be visible anymore
      expect(
        screen.queryByRole("button", { name: /generate visual mnemonic/i })
      ).not.toBeInTheDocument();
    });
  });
});
