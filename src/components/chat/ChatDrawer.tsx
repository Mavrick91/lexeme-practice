import { useEffect, useLayoutEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useChat } from "@/hooks/useChat";
import type { PracticeHistoryItem } from "@/types";
import { Loader2 } from "lucide-react";

type ChatDrawerProps = {
  open: boolean;
  item: PracticeHistoryItem | null;
  onOpenChange: (open: boolean) => void;
};

export const ChatDrawer = ({ open, item, onOpenChange }: ChatDrawerProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<{ focus: () => void }>(null);

  const systemPrompt = item
    ? `You are an AI language tutor. The student is asking about the word "${
        item.word
      }" (translations: ${item.translation.join(
        ", "
      )}). Answer in a concise, friendly way with examples. Help them understand usage, pronunciation, grammar, and provide context.`
    : "";

  const { messages, isSending, isLoading, sendMessage, reset } = useChat(systemPrompt, item?.id);

  // Reset chat when item changes (but not during initial load)
  useEffect(() => {
    if (item && systemPrompt && !isLoading) {
      // Only reset if we're switching to a different item
      reset(systemPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]); // Only depend on item ID to avoid resetting during initial load

  // Auto-scroll to bottom when new messages arrive
  useLayoutEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md lg:max-w-lg"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <SheetHeader>
          <SheetTitle>Ask about "{item.word}"</SheetTitle>
          <SheetDescription>{item.translation.join(", ")}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex h-0 grow flex-col">
          <ScrollArea className="-mr-4 flex-1 pr-4" ref={scrollAreaRef}>
            <div className="space-y-4 pb-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Ask me anything about this word! I can help with usage, examples, grammar,
                  pronunciation, and more.
                </div>
              ) : (
                messages.map((message) => <ChatMessage key={message.id} message={message} />)
              )}
              {isSending && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-muted px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t pt-4">
            <ChatInput
              ref={inputRef}
              onSendMessage={sendMessage}
              isDisabled={isSending}
              autoFocus={false}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
