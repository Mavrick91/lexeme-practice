import { render, screen } from "@/test-utils";
import { ChatMessage } from "./ChatMessage";
import type { ChatRole, ChatMessage as ChatMessageType } from "@/types/chat";

describe("ChatMessage", () => {
  const baseMessage = {
    id: "1",
    content: "Hello\n   world",
    timestamp: Date.now(),
  } as const;

  const createMessage = (role: ChatRole): ChatMessageType => ({
    ...baseMessage,
    role,
  });

  const renderMessage = (role: ChatRole) => {
    return render(<ChatMessage message={createMessage(role)} />);
  };

  // Helper to get message paragraph element
  const getMessageParagraph = () => {
    // Use querySelector to get the paragraph directly
    const paragraph = document.querySelector("p.whitespace-pre-wrap");
    if (!paragraph) throw new Error("Message paragraph not found");
    return paragraph;
  };

  it("renders message content correctly", () => {
    renderMessage("user");

    const paragraph = getMessageParagraph();
    expect(paragraph.textContent).toBe("Hello\n   world");
  });

  it("applies user styling (right-aligned, primary background)", () => {
    renderMessage("user");

    const content = getMessageParagraph();
    const bubble = content.parentElement!;
    const wrapper = bubble.parentElement!;

    // Check alignment
    expect(wrapper).toHaveClass("justify-end");
    expect(wrapper).not.toHaveClass("justify-start");

    // Check background
    expect(bubble).toHaveClass("bg-primary");
    expect(bubble).toHaveClass("text-primary-foreground");
    expect(bubble).not.toHaveClass("bg-muted");
  });

  it("applies assistant styling (left-aligned, muted background)", () => {
    renderMessage("assistant");

    const content = getMessageParagraph();
    const bubble = content.parentElement!;
    const wrapper = bubble.parentElement!;

    // Check alignment
    expect(wrapper).toHaveClass("justify-start");
    expect(wrapper).not.toHaveClass("justify-end");

    // Check background
    expect(bubble).toHaveClass("bg-muted");
    expect(bubble).not.toHaveClass("bg-primary");
    expect(bubble).not.toHaveClass("text-primary-foreground");
  });

  it("handles system role same as assistant", () => {
    renderMessage("system");

    const content = getMessageParagraph();
    const bubble = content.parentElement!;
    const wrapper = bubble.parentElement!;

    // System messages should have same styling as assistant
    expect(wrapper).toHaveClass("justify-start");
    expect(bubble).toHaveClass("bg-muted");
  });

  it("preserves whitespace and applies correct text styling", () => {
    renderMessage("user");

    const paragraph = getMessageParagraph();

    // Check text styling classes
    expect(paragraph).toHaveClass("whitespace-pre-wrap");
    expect(paragraph).toHaveClass("break-words");
    expect(paragraph).toHaveClass("text-sm");
  });

  it("applies correct layout classes", () => {
    renderMessage("user");

    const content = getMessageParagraph();
    const bubble = content.parentElement!;
    const wrapper = bubble.parentElement!;

    // Check wrapper classes
    expect(wrapper).toHaveClass("flex");
    expect(wrapper).toHaveClass("w-full");

    // Check bubble classes
    expect(bubble).toHaveClass("max-w-[80%]");
    expect(bubble).toHaveClass("rounded-lg");
    expect(bubble).toHaveClass("px-4");
    expect(bubble).toHaveClass("py-2");
  });

  it("renders long content with line breaks correctly", () => {
    const longMessage: ChatMessageType = {
      id: "2",
      role: "assistant",
      content: "This is a long message\nwith multiple lines\n\nAnd some spacing",
      timestamp: Date.now(),
    };

    render(<ChatMessage message={longMessage} />);

    const paragraph = document.querySelector("p.whitespace-pre-wrap");
    expect(paragraph?.textContent).toBe(longMessage.content);
  });

  it("renders empty content", () => {
    const emptyMessage: ChatMessageType = {
      id: "3",
      role: "user",
      content: "",
      timestamp: Date.now(),
    };

    render(<ChatMessage message={emptyMessage} />);

    // The paragraph element should still exist even with empty content
    const paragraph = screen.getByText("", { selector: "p" });
    expect(paragraph).toBeInTheDocument();
  });

  it("makes text selectable with appropriate CSS classes", () => {
    renderMessage("user");

    const paragraph = getMessageParagraph();
    const bubble = paragraph.parentElement!;

    // Check that select-text class is applied
    expect(paragraph).toHaveClass("select-text");
    expect(bubble).toHaveClass("select-text");
    expect(bubble).toHaveClass("cursor-text");
  });

  it("allows text selection for both user and assistant messages", () => {
    const { rerender } = renderMessage("user");

    let paragraph = getMessageParagraph();
    let bubble = paragraph.parentElement!;

    // Check user message
    expect(paragraph).toHaveClass("select-text");
    expect(bubble).toHaveClass("select-text");
    expect(bubble).toHaveClass("cursor-text");

    // Check assistant message
    rerender(<ChatMessage message={createMessage("assistant")} />);

    paragraph = getMessageParagraph();
    bubble = paragraph.parentElement!;

    expect(paragraph).toHaveClass("select-text");
    expect(bubble).toHaveClass("select-text");
    expect(bubble).toHaveClass("cursor-text");
  });
});
