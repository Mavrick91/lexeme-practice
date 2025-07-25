import { render, screen } from "@/test-utils";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "./ChatInput";
import { useFocusManager } from "@/hooks/useFocusManager";
import React from "react";

// Mock the useFocusManager hook
jest.mock("@/hooks/useFocusManager");

describe("ChatInput", () => {
  const mockOnSendMessage = jest.fn();
  const mockFocus = jest.fn();
  const mockMaintainFocus = jest.fn();
  const mockReleaseFocus = jest.fn();
  const mockTextareaRef = { current: null };

  beforeEach(() => {
    jest.clearAllMocks();
    (useFocusManager as jest.Mock).mockReturnValue({
      ref: mockTextareaRef,
      focus: mockFocus,
      maintainFocus: mockMaintainFocus,
      releaseFocus: mockReleaseFocus,
    });
  });

  const renderInput = (props = {}) => {
    const defaultProps = {
      onSendMessage: mockOnSendMessage,
    };
    return render(<ChatInput {...defaultProps} {...props} />);
  };

  it("renders correctly with props", () => {
    renderInput();

    expect(screen.getByPlaceholderText("Ask a question about this word...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
  });

  it("handles text input change", async () => {
    const user = userEvent.setup();
    renderInput();

    const textarea = screen.getByPlaceholderText("Ask a question about this word...");
    await user.type(textarea, "hola");

    expect(textarea).toHaveValue("hola");
  });

  it("sends message on Enter key (not Shift+Enter)", async () => {
    const user = userEvent.setup();
    renderInput();

    const textarea = screen.getByPlaceholderText("Ask a question about this word...");

    // Type and press Enter
    await user.type(textarea, "hola");
    await user.keyboard("{Enter}");
    expect(mockOnSendMessage).toHaveBeenCalledWith("hola");
    expect(mockOnSendMessage).toHaveBeenCalledTimes(1);

    // Type and press Shift+Enter
    await user.type(textarea, "hello");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(mockOnSendMessage).toHaveBeenCalledTimes(1); // Still only 1 call
  });

  it("sends message on button click", async () => {
    const user = userEvent.setup();
    renderInput();

    const textarea = screen.getByPlaceholderText("Ask a question about this word...");
    const button = screen.getByRole("button", { name: "Send message" });

    await user.type(textarea, "hola");
    await user.click(button);

    expect(mockOnSendMessage).toHaveBeenCalledWith("hola");
  });

  it("clears input after sending", async () => {
    const user = userEvent.setup();
    renderInput();

    const textarea = screen.getByPlaceholderText("Ask a question about this word...");

    await user.type(textarea, "hola");
    expect(textarea).toHaveValue("hola");

    await user.keyboard("{Enter}");
    expect(textarea).toHaveValue("");
  });

  it("disables button when input is empty", () => {
    renderInput();

    const button = screen.getByRole("button", { name: "Send message" });
    expect(button).toBeDisabled();
  });

  it("disables button and textarea when isDisabled is true", async () => {
    const user = userEvent.setup();
    renderInput({ isDisabled: true });

    const textarea = screen.getByPlaceholderText("Ask a question about this word...");
    const button = screen.getByRole("button", { name: "Send message" });

    expect(textarea).toBeDisabled();
    expect(button).toBeDisabled();

    // Even with text, button should remain disabled
    await user.type(textarea, "hola");
    expect(button).toBeDisabled();
  });

  it("handles autoFocus prop correctly", () => {
    // Test with default autoFocus (true)
    renderInput();
    expect(mockFocus).toHaveBeenCalledTimes(1);

    // Clear mocks and test with autoFocus false
    jest.clearAllMocks();
    renderInput({ autoFocus: false });
    expect(mockFocus).not.toHaveBeenCalled();
  });

  it("exposes focus method via ref", () => {
    const ref = React.createRef<{ focus: () => void }>();
    render(<ChatInput onSendMessage={mockOnSendMessage} ref={ref} />);

    // Initial autoFocus call
    expect(mockFocus).toHaveBeenCalledTimes(1);

    // Call focus via ref
    ref.current?.focus();
    expect(mockFocus).toHaveBeenCalledTimes(2);
  });

  it("maintains focus after sending message", async () => {
    const user = userEvent.setup();
    renderInput();

    const textarea = screen.getByPlaceholderText("Ask a question about this word...");

    await user.type(textarea, "hola");
    await user.keyboard("{Enter}");

    expect(mockMaintainFocus).toHaveBeenCalled();
  });

  it("trims whitespace from messages", async () => {
    const user = userEvent.setup();
    renderInput();

    const textarea = screen.getByPlaceholderText("Ask a question about this word...");

    await user.type(textarea, "  hola  ");
    await user.keyboard("{Enter}");

    expect(mockOnSendMessage).toHaveBeenCalledWith("hola");
  });

  it("does not send empty messages", async () => {
    const user = userEvent.setup();
    renderInput();

    const textarea = screen.getByPlaceholderText("Ask a question about this word...");

    // Try to send only spaces
    await user.type(textarea, "   ");
    await user.keyboard("{Enter}");

    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it("applies custom className", () => {
    renderInput({ className: "custom-class" });

    const container = screen.getByPlaceholderText(
      "Ask a question about this word..."
    ).parentElement;
    expect(container).toHaveClass("custom-class");
  });
});
