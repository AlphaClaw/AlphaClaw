import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { resolveToolDisplay, formatToolDetail } from "../utils/tool-display";
import { cn } from "../lib/utils";

export function ChatToolCard({
  name,
  args,
  output,
}: {
  name: string;
  args?: unknown;
  output?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const display = resolveToolDisplay({ name, args });
  const detail = formatToolDetail(display);

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-[var(--bg-hover)] transition-colors rounded-md"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-[var(--muted)]" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-[var(--muted)]" />
        )}
        <span className="font-medium text-[var(--text)]">{display.title}</span>
        {detail && (
          <span className="truncate text-[var(--muted)]">{detail}</span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] px-2.5 py-2 space-y-2">
          {args !== undefined && args !== null && (
            <div>
              <p className="mb-0.5 font-medium text-[var(--muted)]">Arguments</p>
              <pre className="overflow-x-auto rounded bg-[var(--bg)] p-2 text-[10px] leading-relaxed text-[var(--text)]">
                {typeof args === "string" ? args : JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {output && (
            <div>
              <p className="mb-0.5 font-medium text-[var(--muted)]">Output</p>
              <pre className="overflow-x-auto rounded bg-[var(--bg)] p-2 text-[10px] leading-relaxed text-[var(--text)] max-h-40">
                {output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
