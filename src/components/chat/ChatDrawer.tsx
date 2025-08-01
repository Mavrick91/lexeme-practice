import { useLayoutEffect, useRef, useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useChat } from "@/hooks/useChat";
import type { PracticeHistoryItem } from "@/types";
import { Loader2, ImageIcon } from "lucide-react";
import { CHAT_PROMPT_TEMPLATES } from "@/features/chat/promptTemplates";
import { formatPrompt } from "@/features/chat/formatPrompt";
import { generateImage } from "@/lib/openai";
import { toast } from "sonner";
import { tryCatch } from "@/lib/tryCatch";

type ChatDrawerProps = {
  open: boolean;
  item: PracticeHistoryItem | null;
  onOpenChange: (open: boolean) => void;
};

// Helper component for the image generation action
const ImageMnemonicAction = ({
  isGenerating,
  onClick,
}: {
  isGenerating: boolean;
  onClick: () => void;
}) => {
  if (isGenerating) {
    return (
      <div
        className="mb-3 flex w-full items-center justify-center py-3"
        aria-busy="true"
        data-testid="image-loading"
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Generating visual mnemonic...</span>
      </div>
    );
  }

  return (
    <Button
      onClick={onClick}
      variant="secondary"
      size="sm"
      className="mb-3 w-full"
      data-testid="image-generate-btn"
    >
      <ImageIcon className="mr-2 h-4 w-4" />
      Generate visual mnemonic
    </Button>
  );
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

  const { messages, isSending, isLoading, sendMessage, addAssistantMessage } = useChat(
    systemPrompt,
    item?.word
  );

  const [showImageButton, setShowImageButton] = useState(false);
  const [lastMemoryTipResponse, setLastMemoryTipResponse] = useState<string>("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Capture the memory tips response
  useEffect(() => {
    if (showImageButton && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant" && !lastMessage.imageUrl) {
        setLastMemoryTipResponse(lastMessage.content);
      }
    }
  }, [messages, showImageButton]);

  // Reset states when drawer closes or item changes
  useEffect(() => {
    if (!open || !item) {
      setShowImageButton(false);
      setLastMemoryTipResponse("");
      setIsGeneratingImage(false);
    }
  }, [open, item]);

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
          {/* Pre-built prompt chips */}
          <div className="-mx-1 mb-3">
            <div className="w-full overflow-x-auto">
              <div className="flex gap-2 px-1 pb-2">
                {CHAT_PROMPT_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    variant="secondary"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => {
                      const formattedPrompt = formatPrompt(template.prompt, {
                        currentWord: item.word,
                      });
                      setShowImageButton(template.id === "memory-tips");
                      setLastMemoryTipResponse("");
                      sendMessage(formattedPrompt, { templateId: template.id });
                    }}
                    disabled={isSending}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <ScrollArea className="-mr-4 flex-1 pr-4" ref={scrollAreaRef}>
            <div className="space-y-4 pb-4">
              {isLoading ? (
                <div className="flex justify-center py-8" data-testid="chat-loading">
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
                <div className="flex justify-start" data-testid="chat-sending">
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
            {showImageButton && lastMemoryTipResponse && (
              <ImageMnemonicAction
                isGenerating={isGeneratingImage}
                onClick={async () => {
                  setIsGeneratingImage(true);
                  const prompt = `Create a visual mnemonic to help remember the Indonesian word "${item.word}" (meaning: ${item.translation.join(", ")}). Based on this memory tip: ${lastMemoryTipResponse}. The image should be simple, memorable, and clearly connect the word to its meaning.`;

                  const [imageUrl, error] = await tryCatch(() => generateImage(prompt));

                  if (error) {
                    console.error("Failed to generate image:", error);
                    toast.error("Failed to generate visual mnemonic");
                    setIsGeneratingImage(false);
                    return;
                  }

                  if (imageUrl) {
                    addAssistantMessage("Here's a visual mnemonic to help you remember:", imageUrl);
                    setShowImageButton(false);
                  }
                  setIsGeneratingImage(false);
                }}
              />
            )}
            <ChatInput
              ref={inputRef}
              onSendMessage={sendMessage}
              isDisabled={isSending || isLoading || isGeneratingImage}
              autoFocus={false}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
