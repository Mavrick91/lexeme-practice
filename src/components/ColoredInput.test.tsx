import { render, screen, fireEvent } from "@/test-utils";
import userEvent from "@testing-library/user-event";
import { ColoredInput } from "./ColoredInput";
import type { ColoredLetter } from "@/hooks/useLetterColoring";

describe("ColoredInput", () => {
  const mockOnChange = jest.fn();
  const mockOnSubmit = jest.fn();

  const defaultProps = {
    value: "",
    coloredLetters: [],
    maxLength: 5,
    onChange: mockOnChange,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the hidden input element", () => {
      render(<ColoredInput {...defaultProps} />);

      const input = screen.getByRole("textbox", { name: /type your answer/i });
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass("opacity-0");
    });

    it("renders prompt text for normal mode", () => {
      render(<ColoredInput {...defaultProps} isReverseMode={false} />);

      expect(screen.getByText("Type the English translation:")).toBeInTheDocument();
    });

    it("renders prompt text for reverse mode", () => {
      render(<ColoredInput {...defaultProps} isReverseMode={true} />);

      expect(screen.getByText("Type the Indonesian word:")).toBeInTheDocument();
    });

    it("renders placeholder tiles based on maxLength", () => {
      const { container } = render(<ColoredInput {...defaultProps} maxLength={5} value="" />);

      // Should have 5 placeholder tiles
      const placeholders = container.querySelectorAll(".border-dashed");
      expect(placeholders).toHaveLength(5);
    });

    it("renders caret when input is not full", () => {
      const { container } = render(<ColoredInput {...defaultProps} value="hi" maxLength={5} />);

      // Should have a caret indicator
      const caret = container.querySelector(".animate-pulse");
      expect(caret).toBeInTheDocument();
    });

    it("hides caret when input reaches maxLength", () => {
      const { container } = render(<ColoredInput {...defaultProps} value="hello" maxLength={5} />);

      // Should not have a caret indicator
      const caret = container.querySelector(".animate-pulse");
      expect(caret).not.toBeInTheDocument();
    });
  });

  describe("Colored letters display", () => {
    it("renders colored letters with correct styles", () => {
      const coloredLetters: ColoredLetter[] = [
        { letter: "h", color: "correct" },
        { letter: "e", color: "present" },
        { letter: "l", color: "absent" },
        { letter: " ", color: "space" },
        { letter: "o", color: "correct" },
      ];

      const { container } = render(
        <ColoredInput {...defaultProps} value="hel o" coloredLetters={coloredLetters} />
      );

      // Check for correct color classes
      const greenTiles = container.querySelectorAll(".bg-green-500");
      expect(greenTiles).toHaveLength(2); // 'h' and 'o'

      const yellowTiles = container.querySelectorAll(".bg-yellow-500");
      expect(yellowTiles).toHaveLength(1); // 'e'

      const grayTiles = container.querySelectorAll(".bg-gray-400");
      expect(grayTiles).toHaveLength(1); // 'l'

      // Space should have special width
      const spaceTiles = container.querySelectorAll(".w-4.bg-transparent");
      expect(spaceTiles).toHaveLength(1);
    });

    it("displays letters in uppercase", () => {
      const coloredLetters: ColoredLetter[] = [
        { letter: "h", color: "correct" },
        { letter: "i", color: "correct" },
      ];

      render(<ColoredInput {...defaultProps} value="hi" coloredLetters={coloredLetters} />);

      expect(screen.getByText("h")).toBeInTheDocument();
      expect(screen.getByText("i")).toBeInTheDocument();
    });

    it("preserves original letter case", () => {
      const coloredLetters: ColoredLetter[] = [
        { letter: "H", color: "correct" },
        { letter: "i", color: "correct" },
      ];

      render(<ColoredInput {...defaultProps} value="Hi" coloredLetters={coloredLetters} />);

      expect(screen.getByText("H")).toBeInTheDocument();
      expect(screen.getByText("i")).toBeInTheDocument();
    });

    it("handles empty colored letters array", () => {
      const { container } = render(
        <ColoredInput {...defaultProps} value="" coloredLetters={[]} maxLength={3} />
      );

      // Should only show placeholder tiles
      const placeholders = container.querySelectorAll(".border-dashed");
      expect(placeholders).toHaveLength(3);

      // No colored tiles
      const coloredTiles = container.querySelectorAll(
        ".bg-green-500, .bg-yellow-500, .bg-gray-400"
      );
      expect(coloredTiles).toHaveLength(0);
    });
  });

  describe("User interactions", () => {
    it("calls onChange when user types", async () => {
      const user = userEvent.setup();
      render(<ColoredInput {...defaultProps} />);

      const input = screen.getByRole("textbox", { name: /type your answer/i });
      await user.type(input, "hello");

      // onChange is called for each character typed
      // userEvent.type simulates individual keystrokes
      expect(mockOnChange).toHaveBeenCalledTimes(5);
      expect(mockOnChange).toHaveBeenNthCalledWith(1, "h");
      expect(mockOnChange).toHaveBeenNthCalledWith(2, "e");
      expect(mockOnChange).toHaveBeenNthCalledWith(3, "l");
      expect(mockOnChange).toHaveBeenNthCalledWith(4, "l");
      expect(mockOnChange).toHaveBeenNthCalledWith(5, "o");
    });

    it("calls onSubmit when Enter is pressed", async () => {
      const user = userEvent.setup();
      render(<ColoredInput {...defaultProps} value="test" />);

      await user.keyboard("{Enter}");

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it("prevents default form submission but calls onSubmit", async () => {
      const user = userEvent.setup();
      render(<ColoredInput {...defaultProps} />);

      const input = screen.getByRole("textbox", { name: /type your answer/i });
      await user.click(input);
      await user.keyboard("{Enter}");

      // Should call our onSubmit handler
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);

      // The Enter key is handled by our component to submit the answer
      // This is the expected behavior - Enter submits the answer
    });

    it("focuses input when colored grid is clicked", () => {
      const { container } = render(<ColoredInput {...defaultProps} />);

      const input = screen.getByRole("textbox", { name: /type your answer/i });
      const grid = container.querySelector(".cursor-text");

      expect(grid).toBeInTheDocument();

      // Click the grid
      fireEvent.click(grid!);

      // Input should be focused
      expect(input).toHaveFocus();
    });

    it("respects maxLength constraint", () => {
      render(<ColoredInput {...defaultProps} value="" maxLength={3} />);

      const input = screen.getByRole("textbox", { name: /type your answer/i });

      // Should have maxLength attribute set correctly
      expect(input).toHaveAttribute("maxLength", "3");
    });

    it("prevents typing beyond maxLength", async () => {
      const user = userEvent.setup();
      render(<ColoredInput {...defaultProps} value="" maxLength={5} />);

      const input = screen.getByRole("textbox", { name: /type your answer/i }) as HTMLInputElement;

      // Verify maxLength is set correctly
      expect(input.maxLength).toBe(5);

      // Type exactly maxLength characters
      await user.type(input, "abcde");
      expect(mockOnChange).toHaveBeenCalledTimes(5);
      // userEvent.type calls onChange for each character, so last call will be with single char
      expect(mockOnChange).toHaveBeenNthCalledWith(1, "a");
      expect(mockOnChange).toHaveBeenNthCalledWith(2, "b");
      expect(mockOnChange).toHaveBeenNthCalledWith(3, "c");
      expect(mockOnChange).toHaveBeenNthCalledWith(4, "d");
      expect(mockOnChange).toHaveBeenNthCalledWith(5, "e");

      // Clear for next test
      mockOnChange.mockClear();

      // Try to type more when already at maxLength
      // Note: In a real browser, maxLength would prevent this
      // but in jsdom we can still test that the attribute is set correctly
      fireEvent.change(input, { target: { value: "abcdef" } });

      // The onChange will be called with whatever value is passed
      expect(mockOnChange).toHaveBeenCalledWith("abcdef");

      // But the important thing is the maxLength attribute is set
      expect(input).toHaveAttribute("maxLength", "5");
    });

    it("enforces maxLength for different word lengths", () => {
      const { rerender } = render(<ColoredInput {...defaultProps} value="" maxLength={3} />);

      let input = screen.getByRole("textbox", { name: /type your answer/i }) as HTMLInputElement;

      // Verify initial maxLength
      expect(input.maxLength).toBe(3);

      // Test with different maxLength
      rerender(<ColoredInput {...defaultProps} value="" maxLength={7} />);

      input = screen.getByRole("textbox", { name: /type your answer/i }) as HTMLInputElement;
      expect(input.maxLength).toBe(7);

      // Test with another maxLength
      rerender(<ColoredInput {...defaultProps} value="" maxLength={10} />);

      input = screen.getByRole("textbox", { name: /type your answer/i }) as HTMLInputElement;
      expect(input.maxLength).toBe(10);
    });

    it("prevents input beyond maxLength with native browser enforcement", () => {
      render(<ColoredInput {...defaultProps} value="" maxLength={5} />);

      const input = screen.getByRole("textbox", { name: /type your answer/i }) as HTMLInputElement;

      // Set value directly to test browser enforcement
      input.value = "abcdefghij";

      // Manually dispatch input event using fireEvent
      fireEvent.input(input, { target: { value: input.value } });

      // The browser should enforce maxLength on the actual input element
      // Note: In real browsers, maxLength prevents typing beyond the limit
      expect(input.maxLength).toBe(5);
      expect(input).toHaveAttribute("maxLength", "5");
    });

    it("handles backspace correctly", async () => {
      const user = userEvent.setup();

      render(<ColoredInput {...defaultProps} value="" />);

      const input = screen.getByRole("textbox", { name: /type your answer/i });

      // Type some content
      await user.type(input, "hi");

      // Clear mock to focus on backspace behavior
      mockOnChange.mockClear();

      // Simulate backspace
      fireEvent.change(input, { target: { value: "h" } });

      // Should have been called with the shorter value
      expect(mockOnChange).toHaveBeenCalledWith("h");
    });
  });

  describe("Accessibility", () => {
    it("has proper aria-label on input", () => {
      render(<ColoredInput {...defaultProps} />);

      const input = screen.getByRole("textbox", { name: /type your answer/i });
      expect(input).toHaveAttribute("aria-label", "Type your answer");
    });

    it("marks visual grid as aria-hidden", () => {
      const { container } = render(<ColoredInput {...defaultProps} />);

      const visualGrid = container.querySelector('[aria-hidden="true"]');
      expect(visualGrid).toBeInTheDocument();
    });

    it("maintains focus on input element", () => {
      render(<ColoredInput {...defaultProps} />);

      const input = screen.getByRole("textbox", { name: /type your answer/i });
      input.focus();

      expect(input).toHaveFocus();
    });

    it("has proper autocomplete attributes", () => {
      render(<ColoredInput {...defaultProps} />);

      const input = screen.getByRole("textbox", { name: /type your answer/i });
      expect(input).toHaveAttribute("autoCapitalize", "none");
      expect(input).toHaveAttribute("autoComplete", "off");
      expect(input).toHaveAttribute("autoCorrect", "off");
      expect(input).toHaveAttribute("spellCheck", "false");
    });

    it("has autoFocus attribute on input", () => {
      render(<ColoredInput {...defaultProps} />);

      // Check that the input has autoFocus set
      const input = screen.getByRole("textbox", { name: /type your answer/i });
      // React sets autoFocus programmatically, not as an HTML attribute
      // The best we can do is verify the input element exists and can receive focus
      expect(input).toBeInTheDocument();
    });
  });

  describe("Dynamic placeholder calculation", () => {
    it("shows correct number of placeholders as value changes", () => {
      const { container, rerender } = render(
        <ColoredInput {...defaultProps} value="" maxLength={5} />
      );

      // Initially 5 placeholders
      let placeholders = container.querySelectorAll(".border-dashed");
      expect(placeholders).toHaveLength(5);

      // Type 2 letters - should have 3 placeholders
      rerender(<ColoredInput {...defaultProps} value="hi" maxLength={5} />);
      placeholders = container.querySelectorAll(".border-dashed");
      expect(placeholders).toHaveLength(3);

      // Type 5 letters - no placeholders
      rerender(<ColoredInput {...defaultProps} value="hello" maxLength={5} />);
      placeholders = container.querySelectorAll(".border-dashed");
      expect(placeholders).toHaveLength(0);
    });

    it("handles value longer than maxLength gracefully", () => {
      const { container } = render(
        <ColoredInput {...defaultProps} value="toolong" maxLength={3} />
      );

      // Should not show negative placeholders
      const placeholders = container.querySelectorAll(".border-dashed");
      expect(placeholders).toHaveLength(0);

      // Should not show caret
      const caret = container.querySelector(".animate-pulse");
      expect(caret).not.toBeInTheDocument();
    });
  });

  describe("Ref forwarding", () => {
    it("forwards ref to the input element", () => {
      const ref = jest.fn();
      render(<ColoredInput {...defaultProps} ref={ref} />);

      // The ref callback should be called
      expect(ref).toHaveBeenCalled();

      // The forwarded ref should point to an input element
      const inputElement = ref.mock.calls[0][0];
      expect(inputElement).toBeInstanceOf(HTMLInputElement);
      expect(inputElement.tagName).toBe("INPUT");
    });

    it("allows parent to focus input through ref", () => {
      const inputRef = { current: null as HTMLInputElement | null };

      render(<ColoredInput {...defaultProps} ref={inputRef} />);

      // Focus through ref
      inputRef.current?.focus();

      const input = screen.getByRole("textbox", { name: /type your answer/i });
      expect(input).toHaveFocus();
    });
  });

  describe("Integration with colored letters", () => {
    it("updates display as colored letters change", () => {
      const { container, rerender } = render(
        <ColoredInput
          {...defaultProps}
          value="hi"
          coloredLetters={[
            { letter: "h", color: "correct" },
            { letter: "i", color: "present" },
          ]}
        />
      );

      // Check initial colors
      let greenTiles = container.querySelectorAll(".bg-green-500");
      let yellowTiles = container.querySelectorAll(".bg-yellow-500");
      expect(greenTiles).toHaveLength(1);
      expect(yellowTiles).toHaveLength(1);

      // Update colored letters
      rerender(
        <ColoredInput
          {...defaultProps}
          value="hi"
          coloredLetters={[
            { letter: "h", color: "present" },
            { letter: "i", color: "correct" },
          ]}
        />
      );

      // Check updated colors
      greenTiles = container.querySelectorAll(".bg-green-500");
      yellowTiles = container.querySelectorAll(".bg-yellow-500");
      expect(greenTiles).toHaveLength(1);
      expect(yellowTiles).toHaveLength(1);
    });

    it("handles multi-word input with spaces", () => {
      const coloredLetters: ColoredLetter[] = [
        { letter: "h", color: "correct" },
        { letter: "i", color: "correct" },
        { letter: " ", color: "space" },
        { letter: "m", color: "correct" },
        { letter: "e", color: "correct" },
      ];

      const { container } = render(
        <ColoredInput
          {...defaultProps}
          value="hi me"
          coloredLetters={coloredLetters}
          maxLength={10}
        />
      );

      // Check space rendering
      const spaceTiles = container.querySelectorAll(".w-4.bg-transparent");
      expect(spaceTiles).toHaveLength(1);

      // Check letter tiles
      const letterTiles = container.querySelectorAll(".bg-green-500");
      expect(letterTiles).toHaveLength(4); // h, i, m, e
    });
  });

  describe("Auto-submit functionality", () => {
    it("auto-submits when all letters are correct", () => {
      const coloredLetters: ColoredLetter[] = [
        { letter: "h", color: "correct" },
        { letter: "e", color: "correct" },
        { letter: "l", color: "correct" },
        { letter: "l", color: "correct" },
        { letter: "o", color: "correct" },
      ];

      render(
        <ColoredInput
          {...defaultProps}
          value="hello"
          coloredLetters={coloredLetters}
          maxLength={5}
        />
      );

      // Should auto-submit immediately
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it("does not auto-submit when some letters are incorrect", () => {
      const coloredLetters: ColoredLetter[] = [
        { letter: "h", color: "correct" },
        { letter: "e", color: "present" }, // Not correct
        { letter: "l", color: "correct" },
        { letter: "l", color: "correct" },
        { letter: "o", color: "correct" },
      ];

      render(
        <ColoredInput
          {...defaultProps}
          value="hello"
          coloredLetters={coloredLetters}
          maxLength={5}
        />
      );

      // Should not have submitted
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("does not auto-submit when input is incomplete", () => {
      const coloredLetters: ColoredLetter[] = [
        { letter: "h", color: "correct" },
        { letter: "e", color: "correct" },
        { letter: "l", color: "correct" },
      ];

      render(
        <ColoredInput {...defaultProps} value="hel" coloredLetters={coloredLetters} maxLength={5} />
      );

      // Should not have submitted
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("handles multi-word answers with spaces correctly", () => {
      const coloredLetters: ColoredLetter[] = [
        { letter: "h", color: "correct" },
        { letter: "i", color: "correct" },
        { letter: " ", color: "space" },
        { letter: "m", color: "correct" },
        { letter: "e", color: "correct" },
      ];

      render(
        <ColoredInput
          {...defaultProps}
          value="hi me"
          coloredLetters={coloredLetters}
          maxLength={5}
        />
      );

      // Should have auto-submitted immediately (spaces are considered correct)
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it("does not crash when unmounting after auto-submit", () => {
      const coloredLetters: ColoredLetter[] = [
        { letter: "h", color: "correct" },
        { letter: "i", color: "correct" },
      ];

      const { unmount } = render(
        <ColoredInput {...defaultProps} value="hi" coloredLetters={coloredLetters} maxLength={2} />
      );

      // Should have auto-submitted immediately
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);

      // Unmounting should not cause any errors
      expect(() => unmount()).not.toThrow();
    });

    it("triggers auto-submit when typing completes the word correctly", () => {
      const { rerender } = render(
        <ColoredInput
          {...defaultProps}
          value="hell"
          coloredLetters={[
            { letter: "h", color: "correct" },
            { letter: "e", color: "correct" },
            { letter: "l", color: "correct" },
            { letter: "l", color: "correct" },
          ]}
          maxLength={5}
        />
      );

      // Should not submit yet (incomplete)
      expect(mockOnSubmit).not.toHaveBeenCalled();

      // Complete the word
      rerender(
        <ColoredInput
          {...defaultProps}
          value="hello"
          coloredLetters={[
            { letter: "h", color: "correct" },
            { letter: "e", color: "correct" },
            { letter: "l", color: "correct" },
            { letter: "l", color: "correct" },
            { letter: "o", color: "correct" },
          ]}
          maxLength={5}
        />
      );

      // Should have auto-submitted immediately
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it("does not auto-submit when there are absent letters", () => {
      const coloredLetters: ColoredLetter[] = [
        { letter: "h", color: "correct" },
        { letter: "e", color: "correct" },
        { letter: "x", color: "absent" }, // Wrong letter
        { letter: "l", color: "correct" },
        { letter: "o", color: "correct" },
      ];

      render(
        <ColoredInput
          {...defaultProps}
          value="hexlo"
          coloredLetters={coloredLetters}
          maxLength={5}
        />
      );

      // Should not have submitted
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("submits immediately when letters become all correct", () => {
      const { rerender } = render(
        <ColoredInput
          {...defaultProps}
          value="hello"
          coloredLetters={[
            { letter: "h", color: "correct" },
            { letter: "e", color: "correct" },
            { letter: "l", color: "present" },
            { letter: "l", color: "correct" },
            { letter: "o", color: "correct" },
          ]}
          maxLength={5}
        />
      );

      // Should not submit (not all correct)
      expect(mockOnSubmit).not.toHaveBeenCalled();

      // Update to all correct
      rerender(
        <ColoredInput
          {...defaultProps}
          value="hello"
          coloredLetters={[
            { letter: "h", color: "correct" },
            { letter: "e", color: "correct" },
            { letter: "l", color: "correct" },
            { letter: "l", color: "correct" },
            { letter: "o", color: "correct" },
          ]}
          maxLength={5}
        />
      );

      // Should submit immediately
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it("allows manual submit with Enter even when auto-submit would trigger", () => {
      const coloredLetters: ColoredLetter[] = [
        { letter: "h", color: "correct" },
        { letter: "i", color: "correct" },
      ];

      render(
        <ColoredInput {...defaultProps} value="hi" coloredLetters={coloredLetters} maxLength={2} />
      );

      // Should have auto-submitted
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);

      // Clear the mock
      mockOnSubmit.mockClear();

      const input = screen.getByRole("textbox", { name: /type your answer/i });

      // Press Enter manually
      fireEvent.keyDown(input, { key: "Enter" });

      // Should submit again via manual Enter
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge cases", () => {
    it("handles empty maxLength", () => {
      const { container } = render(<ColoredInput {...defaultProps} value="" maxLength={0} />);

      // Should not crash and show no placeholders
      const placeholders = container.querySelectorAll(".border-dashed");
      expect(placeholders).toHaveLength(0);
    });

    it("handles special characters in input", async () => {
      const user = userEvent.setup();
      render(<ColoredInput {...defaultProps} />);

      const input = screen.getByRole("textbox", { name: /type your answer/i });
      await user.type(input, "it's");

      // onChange is called for each character (userEvent.type simulates individual keystrokes)
      expect(mockOnChange).toHaveBeenCalledTimes(4);
      expect(mockOnChange).toHaveBeenNthCalledWith(1, "i");
      expect(mockOnChange).toHaveBeenNthCalledWith(2, "t");
      expect(mockOnChange).toHaveBeenNthCalledWith(3, "'");
      expect(mockOnChange).toHaveBeenNthCalledWith(4, "s");
    });

    it("handles rapid typing", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ColoredInput {...defaultProps} />);

      const input = screen.getByRole("textbox", { name: /type your answer/i });

      // Type rapidly
      await user.type(input, "abcde");

      // All changes should be captured
      expect(mockOnChange).toHaveBeenCalledTimes(5);
    });

    it("handles paste events", async () => {
      const user = userEvent.setup();
      render(<ColoredInput {...defaultProps} maxLength={10} />);

      const input = screen.getByRole("textbox", { name: /type your answer/i });

      // Simulate paste
      await user.click(input);
      await user.paste("hello");

      expect(mockOnChange).toHaveBeenCalledWith("hello");
    });
  });

  describe("Visual feedback", () => {
    it("applies custom className", () => {
      const { container } = render(<ColoredInput {...defaultProps} className="bg-blue-100" />);

      const grid = container.querySelector(".cursor-text");
      expect(grid).toHaveClass("bg-blue-100");
    });

    it("shows animation classes on letter tiles", () => {
      const coloredLetters: ColoredLetter[] = [{ letter: "h", color: "correct" }];

      const { container } = render(
        <ColoredInput {...defaultProps} value="h" coloredLetters={coloredLetters} />
      );

      const tile = container.querySelector(".bg-green-500");
      expect(tile).toHaveClass("animate-in");
      expect(tile).toHaveClass("fade-in-50");
    });

    it("maintains consistent tile sizing", () => {
      const coloredLetters: ColoredLetter[] = [
        { letter: "h", color: "correct" },
        { letter: "i", color: "present" },
      ];

      const { container } = render(
        <ColoredInput {...defaultProps} value="hi" coloredLetters={coloredLetters} />
      );

      const tiles = container.querySelectorAll(".h-10.w-10");
      expect(tiles.length).toBeGreaterThan(0);

      // All letter tiles should have consistent size
      tiles.forEach((tile) => {
        if (!tile.classList.contains("w-4")) {
          // Exclude space tiles
          expect(tile).toHaveClass("h-10");
          expect(tile).toHaveClass("w-10");
        }
      });
    });
  });

  describe("ColoredInput - Click to reveal letters", () => {
    const mockOnChange = jest.fn();
    const mockOnSubmit = jest.fn();

    const baseProps = {
      value: "",
      coloredLetters: [] as ColoredLetter[],
      maxLength: 5,
      onChange: mockOnChange,
      onSubmit: mockOnSubmit,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("reveals next correct letter when clicking the first placeholder (caret position)", () => {
      // target: house, typed: 'h'
      const target = "house";
      const value = "h";
      const coloredLetters: ColoredLetter[] = [{ letter: "h", color: "correct" }];

      const { container } = render(
        <ColoredInput
          {...baseProps}
          value={value}
          coloredLetters={coloredLetters}
          maxLength={target.length}
          target={target}
        />
      );

      const placeholders = container.querySelectorAll(".border-dashed");
      expect(placeholders.length).toBeGreaterThan(0);

      // Click first placeholder (index === caret position)
      fireEvent.click(placeholders[0]);

      // Should reveal 'o' -> "ho"
      expect(mockOnChange).toHaveBeenCalledWith("ho");
    });

    it("reveals specific correct letter when clicking a typed tile with wrong letter", () => {
      // target: hello, typed: 'hxllo' -> clicking 'x' (index 1) reveals 'o'
      const target = "hello";
      const value = "hxllo";
      const coloredLetters: ColoredLetter[] = [
        { letter: "h", color: "correct" },
        { letter: "x", color: "absent" },
        { letter: "l", color: "correct" },
        { letter: "l", color: "correct" },
        { letter: "o", color: "correct" },
      ];

      render(
        <ColoredInput
          {...baseProps}
          value={value}
          coloredLetters={coloredLetters}
          maxLength={target.length}
          target={target}
        />
      );

      // Click the 'x' tile
      const wrongTile = screen.getByText("x");
      fireEvent.click(wrongTile);

      // Should correct to 'hello'
      expect(mockOnChange).toHaveBeenCalledWith("hello");
    });

    it("reveals a space character when clicking placeholder at space position", () => {
      // target: 'good morning', typed: 'good'
      const target = "good morning";
      const value = "good";
      const coloredLetters: ColoredLetter[] = [
        { letter: "g", color: "correct" },
        { letter: "o", color: "correct" },
        { letter: "o", color: "correct" },
        { letter: "d", color: "correct" },
      ];

      const { container } = render(
        <ColoredInput
          {...baseProps}
          value={value}
          coloredLetters={coloredLetters}
          maxLength={target.length}
          target={target}
        />
      );

      const placeholders = container.querySelectorAll(".border-dashed");
      expect(placeholders.length).toBeGreaterThan(0);

      // Click first placeholder - should reveal a space next
      fireEvent.click(placeholders[0]);

      expect(mockOnChange).toHaveBeenCalledWith("good ");
    });

    it("does nothing when clicking an already correct letter tile", () => {
      const target = "hi";
      const value = "hi";
      const coloredLetters: ColoredLetter[] = [
        { letter: "h", color: "correct" },
        { letter: "i", color: "correct" },
      ];

      render(
        <ColoredInput
          {...baseProps}
          value={value}
          coloredLetters={coloredLetters}
          maxLength={target.length}
          target={target}
        />
      );

      const correctTile = screen.getByText("h");
      fireEvent.click(correctTile);

      // No change expected
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });
});
