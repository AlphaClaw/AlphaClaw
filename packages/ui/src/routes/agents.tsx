import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/page-header";
import { useGatewayQuery } from "../hooks/use-gateway-query";
import { cn } from "../lib/utils";
import type { AgentsListResult, GatewayAgentRow } from "../types/gateway";

function AgentAvatar({
  identity,
}: {
  identity?: GatewayAgentRow["identity"];
}) {
  if (identity?.avatarUrl) {
    return (
      <img
        src={identity.avatarUrl}
        alt={identity.name ?? "agent"}
        className="h-10 w-10 rounded-full object-cover border border-[var(--border)]"
      />
    );
  }

  if (identity?.emoji) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg)] border border-[var(--border)] text-lg">
        {identity.emoji}
      </div>
    );
  }

  if (identity?.avatar) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/10 border border-[var(--border)] text-sm font-bold text-[var(--accent)]">
        {identity.avatar.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg)] border border-[var(--border)] text-sm font-bold text-[var(--muted)]">
      ?
    </div>
  );
}

function AgentCard({
  agent,
  isDefault,
}: {
  agent: GatewayAgentRow;
  isDefault: boolean;
}) {
  const displayName = agent.identity?.name ?? agent.name ?? agent.id;
  const theme = agent.identity?.theme;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-[var(--card)] transition-shadow hover:shadow-sm",
        isDefault ? "border-[var(--accent)]/40" : "border-[var(--border)]",
      )}
    >
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          <AgentAvatar identity={agent.identity} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-[var(--text)]">
                {displayName}
              </h3>
              {isDefault && (
                <span className="shrink-0 rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                  default
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--muted)]">
              {agent.id}
            </p>
            {agent.name && agent.identity?.name && agent.name !== agent.identity.name && (
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Config name: {agent.name}
              </p>
            )}
          </div>
        </div>

        {theme && (
          <div className="mt-3">
            <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
              Theme
            </span>
            <p className="mt-0.5 text-xs text-[var(--text)]">{theme}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentsPage() {
  const { data, isLoading, error } = useGatewayQuery<AgentsListResult>(
    "agents.list",
  );

  const agents = data?.agents ?? [];
  const defaultId = data?.defaultId;

  return (
    <div>
      <PageHeader
        title="Agents"
        subtitle="Manage agent workspaces, tools, and identities."
        actions={
          data ? (
            <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
              <span>
                <span className="font-medium text-[var(--text)]">{agents.length}</span>{" "}
                agent{agents.length !== 1 ? "s" : ""}
              </span>
              {data.scope && (
                <span>
                  Scope: <span className="font-medium text-[var(--text)]">{data.scope}</span>
                </span>
              )}
            </div>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-3">
          <p className="text-sm text-[var(--destructive)]">
            Failed to fetch agents: {error.message}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)]"
            />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">No agents configured.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isDefault={agent.id === defaultId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/agents")({
  component: AgentsPage,
});
