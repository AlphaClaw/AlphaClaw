import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { PageHeader } from "../components/page-header";
import { useGatewayQuery } from "../hooks/use-gateway-query";
import { useGatewayMutation } from "../hooks/use-gateway-mutation";
import type { SessionsListResult, GatewaySessionRow } from "../types/gateway";
import { cn } from "../lib/utils";
import { formatAgo } from "../utils/format";

const KIND_STYLES: Record<string, string> = {
  direct: "bg-blue-500/15 text-blue-400",
  group: "bg-purple-500/15 text-purple-400",
  global: "bg-emerald-500/15 text-emerald-400",
  unknown: "bg-neutral-500/15 text-neutral-400",
};

function formatTokens(input?: number, output?: number): string {
  if (input == null && output == null) return "--";
  const fmt = (n?: number) => (n != null ? n.toLocaleString() : "0");
  return `${fmt(input)} / ${fmt(output)}`;
}

function SessionsPage() {
  const { data, isLoading, error } = useGatewayQuery<SessionsListResult>(
    "sessions.list",
    undefined,
    { refetchInterval: 10000 },
  );

  const sessions = data?.sessions ?? [];
  const count = data?.count ?? sessions.length;
  const defaults = data?.defaults;

  return (
    <div>
      <PageHeader
        title="Sessions"
        subtitle="Inspect active sessions and adjust per-session defaults."
        actions={
          <span className="text-xs tabular-nums text-[var(--muted)]">
            {count} session{count !== 1 ? "s" : ""}
          </span>
        }
      />

      {/* Defaults info bar */}
      {defaults && (
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <span className="text-xs font-medium uppercase text-[var(--muted)]">Defaults</span>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text)]">
            <span className="text-[var(--muted)]">Model:</span>
            <span className="font-mono">{defaults.model ?? "not set"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text)]">
            <span className="text-[var(--muted)]">Context tokens:</span>
            <span className="font-mono tabular-nums">
              {defaults.contextTokens != null
                ? defaults.contextTokens.toLocaleString()
                : "not set"}
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--muted)]">Loading sessions...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--danger,red)]">
              Failed to load sessions: {error.message}
            </p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--muted)]">No active sessions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-medium uppercase text-[var(--muted)]">
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Kind</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Tokens (in/out)</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <SessionRow key={session.key} session={session} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: GatewaySessionRow }) {
  const resetMutation = useGatewayMutation<{ key: string }, unknown>(
    "sessions.reset",
    { invalidates: ["sessions.list"] },
  );

  const handleReset = useCallback(() => {
    if (!window.confirm(`Reset session "${session.label || session.key}"? This will clear the conversation history.`)) {
      return;
    }
    resetMutation.mutate({ key: session.key });
  }, [session.key, session.label, resetMutation]);

  const kindStyle = KIND_STYLES[session.kind] ?? KIND_STYLES.unknown;

  return (
    <tr className="border-b border-[var(--border)] text-[var(--text)] transition-colors last:border-b-0 hover:bg-[var(--bg)]">
      {/* Key */}
      <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs" title={session.key}>
        {session.key}
      </td>

      {/* Kind */}
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-block rounded px-1.5 py-0.5 text-xs font-medium",
            kindStyle,
          )}
        >
          {session.kind}
        </span>
      </td>

      {/* Label */}
      <td className="max-w-[180px] truncate px-4 py-3 text-xs" title={session.label ?? session.displayName ?? ""}>
        {session.label || session.displayName || (
          <span className="text-[var(--muted)]">--</span>
        )}
      </td>

      {/* Model */}
      <td className="px-4 py-3 font-mono text-xs">
        {session.model ? (
          <span title={`${session.modelProvider ? `${session.modelProvider}/` : ""}${session.model}`}>
            {session.model}
          </span>
        ) : (
          <span className="text-[var(--muted)]">default</span>
        )}
      </td>

      {/* Tokens */}
      <td className="px-4 py-3 font-mono text-xs tabular-nums">
        {formatTokens(session.inputTokens, session.outputTokens)}
      </td>

      {/* Updated */}
      <td className="px-4 py-3 text-xs tabular-nums text-[var(--muted)]">
        {formatAgo(session.updatedAt)}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={handleReset}
          disabled={resetMutation.isPending}
          className={cn(
            "rounded border border-[var(--border)] px-2.5 py-1 text-xs font-medium transition-colors",
            "text-[var(--danger,red)] hover:bg-red-500/10",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {resetMutation.isPending ? "Resetting..." : "Reset"}
        </button>
      </td>
    </tr>
  );
}

export const Route = createFileRoute("/sessions")({
  component: SessionsPage,
});
