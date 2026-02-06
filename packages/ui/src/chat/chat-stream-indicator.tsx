import { MarkdownRenderer } from "../components/markdown-renderer";
import { useChatStore } from "../stores/chat-store";
import { cn } from "../lib/utils";

export function ChatStreamIndicator() {
  const chatStream = useChatStore((s) => s.chatStream);
  const chatStreamStartedAt = useChatStore((s) => s.chatStreamStartedAt);

  if (chatStream === null) return null;

  const hasContent = chatStream.trim().length > 0;

  return (
    <div className="flex gap-3 px-2 py-2 justify-start animate-[fade-in_0.15s_ease-out_both]">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-subtle)]">
        <div className="flex gap-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-[pulse-subtle_1.5s_ease-in-out_infinite]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-[pulse-subtle_1.5s_ease-in-out_0.3s_infinite]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-[pulse-subtle_1.5s_ease-in-out_0.6s_infinite]" />
        </div>
      </div>

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
          "bg-[var(--card)] border border-[var(--border)] border-dashed text-[var(--chat-text)]",
        )}
      >
        {hasContent ? (
          <MarkdownRenderer content={chatStream} className="prose prose-sm dark:prose-invert max-w-none" />
        ) : (
          <span className="text-[var(--muted)] text-xs italic">Thinking…</span>
        )}
      </div>
    </div>
  );
}
