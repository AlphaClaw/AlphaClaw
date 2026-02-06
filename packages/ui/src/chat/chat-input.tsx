import { useRef, useState, type KeyboardEvent } from "react";
import { Send, Paperclip, X, StopCircle } from "lucide-react";
import { useChatStore } from "../stores/chat-store";
import { useGatewayStore } from "../stores/gateway-store";
import { generateUUID } from "../utils/uuid";
import { cn } from "../lib/utils";

export function ChatInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatMessage = useChatStore((s) => s.chatMessage);
  const setChatMessage = useChatStore((s) => s.setChatMessage);
  const chatAttachments = useChatStore((s) => s.chatAttachments);
  const setChatAttachments = useChatStore((s) => s.setChatAttachments);
  const chatSending = useChatStore((s) => s.chatSending);
  const chatStream = useChatStore((s) => s.chatStream);
  const enqueue = useChatStore((s) => s.enqueue);
  const client = useGatewayStore((s) => s.client);
  const connected = useGatewayStore((s) => s.connected);
  const chatRunId = useChatStore((s) => s.chatRunId);
  const [isComposing, setIsComposing] = useState(false);

  const isStreaming = chatStream !== null;
  const canSend = connected && (chatMessage.trim() || chatAttachments.length > 0) && !chatSending;

  function handleSend() {
    if (!canSend) return;
    enqueue(chatMessage, chatAttachments.length > 0 ? chatAttachments : undefined);
    setChatMessage("");
    setChatAttachments([]);
    textareaRef.current?.focus();
  }

  function handleAbort() {
    if (!client || !chatRunId) return;
    client.request("chat.abort", { runId: chatRunId }).catch(() => {});
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setChatAttachments([
          ...useChatStore.getState().chatAttachments,
          { id: generateUUID(), dataUrl, mimeType: file.type },
        ]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  }

  function removeAttachment(id: string) {
    setChatAttachments(chatAttachments.filter((a) => a.id !== id));
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--panel)] p-3">
      {/* Attachments preview */}
      {chatAttachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {chatAttachments.map((att) => (
            <div
              key={att.id}
              className="relative flex h-16 w-16 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden"
            >
              {att.mimeType.startsWith("image/") ? (
                <img src={att.dataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Paperclip className="h-5 w-5 text-[var(--muted)]" />
              )}
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--destructive)] text-white"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] transition-colors"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.json,.csv"
          className="hidden"
          onChange={handleFileChange}
        />

        <textarea
          ref={textareaRef}
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={connected ? "Type a message…" : "Connecting…"}
          disabled={!connected}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)]",
            "focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]",
            "max-h-32 min-h-[36px]",
            "disabled:opacity-50",
          )}
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={handleAbort}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--destructive)] text-white hover:opacity-90 transition-opacity"
            title="Stop generating"
          >
            <StopCircle className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
              canSend
                ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                : "bg-[var(--bg-muted)] text-[var(--muted)]",
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
