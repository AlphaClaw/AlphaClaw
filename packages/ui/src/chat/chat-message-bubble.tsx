import { useMemo } from "react";
import { Bot, User } from "lucide-react";
import { MarkdownRenderer } from "../components/markdown-renderer";
import { ChatToolCard } from "./chat-tool-card";
import { cn } from "../lib/utils";
import { useGatewayStore } from "../stores/gateway-store";
import { formatAgo } from "../utils/format";

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id?: string; name: string; input?: unknown }
  | { type: "tool_result"; tool_use_id?: string; content?: unknown };

function extractBlocks(message: unknown): { role: string; blocks: ContentBlock[]; timestamp?: number } {
  const msg = message as Record<string, unknown> | null;
  if (!msg) return { role: "unknown", blocks: [] };

  const role = typeof msg.role === "string" ? msg.role : "unknown";
  const timestamp = typeof msg.timestamp === "number" ? msg.timestamp : undefined;

  const content = msg.content;
  if (typeof content === "string") {
    return { role, blocks: [{ type: "text", text: content }], timestamp };
  }
  if (Array.isArray(content)) {
    const blocks: ContentBlock[] = [];
    for (const item of content) {
      if (!item || typeof item !== "object") continue;
      const block = item as Record<string, unknown>;
      if (block.type === "text" && typeof block.text === "string") {
        blocks.push({ type: "text", text: block.text });
      } else if (block.type === "tool_use") {
        blocks.push({
          type: "tool_use",
          id: typeof block.id === "string" ? block.id : undefined,
          name: typeof block.name === "string" ? block.name : "tool",
          input: block.input,
        });
      } else if (block.type === "tool_result") {
        blocks.push({
          type: "tool_result",
          tool_use_id: typeof block.tool_use_id === "string" ? block.tool_use_id : undefined,
          content: block.content,
        });
      }
    }
    return { role, blocks, timestamp };
  }
  return { role, blocks: [], timestamp };
}

export function ChatMessageBubble({ message }: { message: unknown }) {
  const assistant = useGatewayStore((s) => s.assistant);
  const { role, blocks, timestamp } = useMemo(() => extractBlocks(message), [message]);

  const isUser = role === "user";
  const isAssistant = role === "assistant";

  const textContent = blocks
    .filter((b): b is ContentBlock & { type: "text" } => b.type === "text")
    .map((b) => b.text)
    .join("\n\n");

  const toolCalls = blocks.filter(
    (b): b is ContentBlock & { type: "tool_use" } => b.type === "tool_use",
  );

  return (
    <div
      className={cn(
        "group flex gap-3 px-2 py-2 animate-[rise_0.2s_ease-out_both]",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
          {assistant.avatar ? (
            <span className="text-sm">{assistant.avatar}</span>
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--card)] border border-[var(--border)] text-[var(--chat-text)]",
        )}
      >
        {textContent && (
          <MarkdownRenderer
            content={textContent}
            className={cn(
              "prose prose-sm max-w-none",
              isUser ? "prose-invert" : "dark:prose-invert",
            )}
          />
        )}

        {toolCalls.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {toolCalls.map((tc, i) => (
              <ChatToolCard key={tc.id ?? i} name={tc.name} args={tc.input} />
            ))}
          </div>
        )}

        {timestamp && (
          <div
            className={cn(
              "mt-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity",
              isUser ? "text-white/60" : "text-[var(--muted)]",
            )}
          >
            {formatAgo(timestamp)}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--text)]">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
