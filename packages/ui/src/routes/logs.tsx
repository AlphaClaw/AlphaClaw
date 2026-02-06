import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { PageHeader } from "../components/page-header";
import { useGatewayQuery } from "../hooks/use-gateway-query";
import type { LogEntry, LogLevel } from "../types/gateway";
import { cn } from "../lib/utils";

const LEVEL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  error: { bg: "bg-red-500/15", text: "text-red-400", label: "ERR" },
  fatal: { bg: "bg-red-500/15", text: "text-red-400", label: "FTL" },
  warn: { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "WRN" },
  info: { bg: "bg-blue-500/15", text: "text-blue-400", label: "INF" },
  debug: { bg: "bg-neutral-500/15", text: "text-neutral-400", label: "DBG" },
  trace: { bg: "bg-neutral-500/15", text: "text-neutral-500", label: "TRC" },
};

function LevelBadge({ level }: { level?: LogLevel | null }) {
  const style = LEVEL_STYLES[level ?? ""] ?? {
    bg: "bg-neutral-500/15",
    text: "text-neutral-500",
    label: level?.toUpperCase().slice(0, 3) ?? "???",
  };

  return (
    <span
      className={cn(
        "inline-flex w-9 items-center justify-center rounded px-1 py-0.5 font-mono text-[10px] font-bold uppercase leading-none",
        style.bg,
        style.text,
      )}
    >
      {style.label}
    </span>
  );
}

function LogsPage() {
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useGatewayQuery<{ entries: LogEntry[] }>(
    "logs.tail",
    { limit: 200 },
    {
      refetchInterval: paused ? false : 3000,
    },
  );

  const entries = data?.entries ?? [];

  // Auto-scroll to bottom when new entries arrive (unless paused)
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (paused) return;
    if (entries.length !== prevCountRef.current) {
      prevCountRef.current = entries.length;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries.length, paused]);

  const handleTogglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  const handleScrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Logs"
        subtitle="Live tail of the gateway file logs."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-[var(--muted)]">
              {entries.length} line{entries.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={handleScrollToBottom}
              className={cn(
                "rounded border border-[var(--border)] px-2.5 py-1 text-xs font-medium transition-colors",
                "text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]",
              )}
            >
              Scroll to bottom
            </button>
            <button
              type="button"
              onClick={handleTogglePause}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                paused
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]",
              )}
            >
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
        }
      />

      <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-[var(--muted)]">Loading logs...</p>
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-[var(--danger,red)]">
              Failed to load logs: {error.message}
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-[var(--muted)]">No log entries found.</p>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="h-[calc(100vh-220px)] min-h-[300px] overflow-y-auto p-2"
          >
            <div className="space-y-px">
              {entries.map((entry, idx) => (
                <LogLine key={`${entry.time ?? idx}-${idx}`} entry={entry} />
              ))}
            </div>
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}

function LogLine({ entry }: { entry: LogEntry }) {
  const time = entry.time
    ? new Date(entry.time).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : null;

  const isError = entry.level === "error" || entry.level === "fatal";
  const isWarn = entry.level === "warn";

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded px-2 py-1 font-mono text-xs leading-snug",
        isError && "bg-red-500/5",
        isWarn && "bg-yellow-500/5",
        !isError && !isWarn && "hover:bg-[var(--bg)]",
      )}
    >
      {/* Timestamp */}
      <span className="shrink-0 tabular-nums text-[var(--muted)]">
        {time ?? "--:--:--"}
      </span>

      {/* Level badge */}
      <LevelBadge level={entry.level} />

      {/* Subsystem */}
      {entry.subsystem && (
        <span className="shrink-0 font-semibold text-[var(--accent)]">
          [{entry.subsystem}]
        </span>
      )}

      {/* Message */}
      <span
        className={cn(
          "flex-1 whitespace-pre-wrap break-all",
          isError ? "text-red-400" : "text-[var(--text)]",
        )}
      >
        {entry.message ?? entry.raw}
      </span>
    </div>
  );
}

export const Route = createFileRoute("/logs")({
  component: LogsPage,
});
