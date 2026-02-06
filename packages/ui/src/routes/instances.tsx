import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/page-header";
import { useGatewayQuery } from "../hooks/use-gateway-query";
import type { PresenceEntry } from "../types/gateway";
import { cn } from "../lib/utils";
import { formatAgo, formatList } from "../utils/format";

function InstancesPage() {
  const { data, isLoading, error } = useGatewayQuery<{ entries: PresenceEntry[] }>(
    "presence.list",
    undefined,
    { refetchInterval: 5000 },
  );

  const entries = data?.entries ?? [];

  return (
    <div>
      <PageHeader
        title="Instances"
        subtitle="Presence beacons from connected clients and nodes."
        actions={
          <span className="text-xs tabular-nums text-[var(--muted)]">
            {entries.length} instance{entries.length !== 1 ? "s" : ""}
          </span>
        }
      />

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--muted)]">Loading instances...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--danger,red)]">
              Failed to load instances: {error.message}
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--muted)]">No instances connected.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-medium uppercase text-[var(--muted)]">
                  <th className="px-4 py-3">Instance ID</th>
                  <th className="px-4 py-3">Host</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => {
                  const isStale =
                    entry.ts != null && Date.now() - entry.ts > 30_000;

                  return (
                    <tr
                      key={entry.instanceId ?? idx}
                      className={cn(
                        "border-b border-[var(--border)] last:border-b-0 transition-colors",
                        isStale
                          ? "text-[var(--muted)] opacity-60"
                          : "text-[var(--text)]",
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {entry.instanceId ?? "unknown"}
                      </td>
                      <td className="px-4 py-3">
                        {entry.host ?? <span className="text-[var(--muted)]">--</span>}
                      </td>
                      <td className="px-4 py-3">
                        <PlatformBadge platform={entry.platform} />
                      </td>
                      <td className="px-4 py-3">
                        <ModeBadge mode={entry.mode} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {entry.version ?? <span className="text-[var(--muted)]">--</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {formatList(entry.roles as string[] | undefined)}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums">
                        {formatAgo(entry.ts)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PlatformBadge({ platform }: { platform?: string | null }) {
  if (!platform) return <span className="text-[var(--muted)]">--</span>;
  return (
    <span
      className={cn(
        "inline-block rounded px-1.5 py-0.5 text-xs font-medium",
        "bg-[var(--accent)]/10 text-[var(--accent)]",
      )}
    >
      {platform}
    </span>
  );
}

function ModeBadge({ mode }: { mode?: string | null }) {
  if (!mode) return <span className="text-[var(--muted)]">--</span>;

  const colorMap: Record<string, string> = {
    gateway: "bg-[var(--ok)]/15 text-[var(--ok)]",
    cli: "bg-[var(--accent)]/15 text-[var(--accent)]",
    webchat: "bg-[var(--warn,orange)]/15 text-[var(--warn,orange)]",
  };

  const color = colorMap[mode] ?? "bg-[var(--muted)]/15 text-[var(--muted)]";

  return (
    <span className={cn("inline-block rounded px-1.5 py-0.5 text-xs font-medium", color)}>
      {mode}
    </span>
  );
}

export const Route = createFileRoute("/instances")({
  component: InstancesPage,
});
