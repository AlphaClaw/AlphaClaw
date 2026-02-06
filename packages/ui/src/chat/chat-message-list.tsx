import { useEffect, useRef } from "react";
import { useChatStore } from "../stores/chat-store";
import { ChatMessageBubble } from "./chat-message-bubble";
import { ChatStreamIndicator } from "./chat-stream-indicator";

export function ChatMessageList() {
  const chatMessages = useChatStore((s) => s.chatMessages);
  const chatStream = useChatStore((s) => s.chatStream);
  const chatLoading = useChatStore((s) => s.chatLoading);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or stream updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length, chatStream]);

  if (chatLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
          Loading chat history…
        </div>
      </div>
    );
  }

  if (chatMessages.length === 0 && chatStream === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[var(--muted)]">No messages yet.</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Send a message to start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-4">
      {chatMessages.map((msg, i) => (
        <ChatMessageBubble key={i} message={msg} />
      ))}
      <ChatStreamIndicator />
      <div ref={bottomRef} />
    </div>
  );
}
