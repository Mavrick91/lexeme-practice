import { forwardRef, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";
import type { ColoredLetter } from "@/hooks/useLetterColoring";

type ColoredInputProps = {
  value: string;
  coloredLetters: ColoredLetter[];
  maxLength: number;
  onChange: (value: string) => void;
  onSubmit: () => void;
  className?: string;
  isReverseMode?: boolean;
};

export const ColoredInput = forwardRef<HTMLInputElement, ColoredInputProps>(
  (
    { value, coloredLetters, maxLength, onChange, onSubmit, className, isReverseMode = false },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // Expose the input ref to parent
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      }
    };

    // Calculate how many placeholder tiles to show
    const placeholderCount = Math.max(0, maxLength - value.length);
    const showCaret = value.length < maxLength;

    return (
      <div className="text-center">
        <p className="mb-4 text-lg text-muted-foreground">
          {isReverseMode ? "Type the Indonesian word:" : "Type the English translation:"}
        </p>

        <div
          className={cn(
            "relative mx-auto inline-flex cursor-text items-center gap-1 rounded-lg bg-secondary/20 p-3",
            className
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {/* Hidden but focusable input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={maxLength + 10} // Allow extra characters for testing edge cases
            aria-label="Type your answer"
            className="absolute inset-0 h-full w-full cursor-text opacity-0"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />

          {/* Visible letter tiles */}
          <div className="relative flex gap-1" aria-hidden="true">
            {/* Render colored letters for what's been typed */}
            {coloredLetters.map((coloredLetter, index) => (
              <span
                key={index}
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-md font-mono text-lg font-bold uppercase transition-all",
                  coloredLetter.color === "correct" && "bg-green-500 text-white shadow-sm",
                  coloredLetter.color === "present" && "bg-yellow-500 text-white shadow-sm",
                  coloredLetter.color === "absent" && "bg-gray-400 text-white shadow-sm",
                  coloredLetter.color === "space" && "w-4 bg-transparent",
                  "animate-in fade-in-50 duration-200"
                )}
              >
                {coloredLetter.letter !== " " ? coloredLetter.letter : ""}
              </span>
            ))}

            {/* Caret indicator */}
            {showCaret && (
              <span className="inline-flex h-10 w-1 animate-pulse rounded bg-primary/60" />
            )}

            {/* Placeholder tiles for remaining letters */}
            {Array.from({ length: placeholderCount }).map((_, index) => (
              <span
                key={`placeholder-${index}`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

ColoredInput.displayName = "ColoredInput";
