import { useState, useEffect, forwardRef, useImperativeHandle, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusManager } from "@/hooks/useFocusManager";

type ChatInputProps = {
  onSendMessage: (message: string) => void;
  isDisabled?: boolean;
  className?: string;
  autoFocus?: boolean;
};

export const ChatInput = forwardRef<{ focus: () => void }, ChatInputProps>(
  ({ onSendMessage, isDisabled, className, autoFocus = true }, ref) => {
    const [input, setInput] = useState("");
    const { ref: textareaRef, focus, maintainFocus } = useFocusManager();

    // Expose focus method to parent
    useImperativeHandle(
      ref,
      () => ({
        focus,
      }),
      [focus]
    );

    // Initial focus when component mounts or autoFocus changes
    useEffect(() => {
      if (autoFocus) {
        focus();
      }
    }, [autoFocus, focus]);

    // Maintain focus when disabled state changes
    useEffect(() => {
      if (!isDisabled && autoFocus) {
        maintainFocus();
      }
    }, [isDisabled, autoFocus, maintainFocus]);

    const handleSend = () => {
      if (input.trim() && !isDisabled) {
        onSendMessage(input.trim());
        setInput("");
        // Maintain focus after sending
        maintainFocus();
      }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    return (
      <div className={cn("flex gap-2 items-end", className)}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about this word..."
          disabled={isDisabled}
          className="max-h-[200px] min-h-[80px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          rows={3}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isDisabled}
          size="icon"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    );
  }
);
