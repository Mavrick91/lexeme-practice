import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { cn } from "@/lib/utils";

type ChatMessageProps = {
  message: ChatMessageType;
};

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
      </div>
    </div>
  );
};
