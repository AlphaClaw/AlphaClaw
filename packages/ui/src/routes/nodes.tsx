import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/page-header";
import { useGatewayQuery } from "../hooks/use-gateway-query";
import { cn } from "../lib/utils";
import { formatAgo } from "../utils/format";

type NodeEntry = {
  id: string;
  name?: string;
  platform?: string;
  status?: string;
  lastSeenAt?: number;
  capabilities?: string[];
};

function statusVariant(status?: string): {
  dot: string;
  badge: string;
  label: string;
} {
  switch (status) {
    case "online":
    case "connected":
    case "active":
      return {
        dot: "bg-[var(--ok)]",
        badge: "bg-[var(--ok-subtle)] text-[var(--ok)]",
        label: status,
      };
    case "idle":
    case "away":
      return {
        dot: "bg-[var(--warn)]",
        badge: "bg-[var(--warn)]/10 text-[var(--warn)]",
        label: status,
      };
    case "offline":
    case "disconnected":
      return {
        dot: "bg-[var(--muted)]",
        badge: "bg-[var(--muted)]/10 text-[var(--muted)]",
        label: status,
      };
    default:
      return {
        dot: "bg-[var(--muted)]",
        badge: "bg-[var(--muted)]/10 text-[var(--muted)]",
        label: status ?? "unknown",
      };
  }
}

function NodeCard({ node }: { node: NodeEntry }) {
  const sv = statusVariant(node.status);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[var(--text)]">
              {node.name || node.id}
            </h3>
            {node.name && (
              <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--muted)]">
                {node.id}
              </p>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
              sv.badge,
            )}
          >
            {sv.label}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
          {node.platform && (
            <span>
              Platform:{" "}
              <span className="font-medium text-[var(--text)]">{node.platform}</span>
            </span>
          )}
          <span>
            Last seen:{" "}
            <span className="text-[var(--text)]">{formatAgo(node.lastSeenAt)}</span>
          </span>
        </div>
      </div>

      {node.capabilities && node.capabilities.length > 0 && (
        <div className="border-t border-[var(--border)] bg-[var(--bg)] px-4 py-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Capabilities
          </p>
          <div className="flex flex-wrap gap-1">
            {node.capabilities.map((cap) => (
              <span
                key={cap}
                className="rounded bg-[var(--card)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text)] border border-[var(--border)]"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NodesPage() {
  const { data, isLoading, error } = useGatewayQuery<{
    nodes: NodeEntry[];
  }>("nodes.list");

  const nodes = data?.nodes ?? [];

  return (
    <div>
      <PageHeader
        title="Nodes"
        subtitle="Paired devices, capabilities, and command exposure."
        actions={
          data ? (
            <span className="text-xs text-[var(--muted)]">
              <span className="font-medium text-[var(--text)]">{nodes.length}</span>{" "}
              node{nodes.length !== 1 ? "s" : ""}
            </span>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-3">
          <p className="text-sm text-[var(--destructive)]">
            Failed to fetch nodes: {error.message}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)]"
            />
          ))}
        </div>
      ) : nodes.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">No nodes paired yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {nodes.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/nodes")({
  component: NodesPage,
});
