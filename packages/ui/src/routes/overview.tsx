import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/page-header";
import { useGatewayQuery } from "../hooks/use-gateway-query";
import { cn } from "../lib/utils";
import { formatAgo, formatDurationMs } from "../utils/format";
import type { StatusSummary, HealthSnapshot } from "../types/gateway";

function StatusCard({
  label,
  value,
  detail,
  variant = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  variant?: "default" | "ok" | "warn" | "error";
}) {
  const dotColor = {
    default: "bg-[var(--muted)]",
    ok: "bg-[var(--ok)]",
    warn: "bg-[var(--warn)]",
    error: "bg-[var(--destructive)]",
  }[variant];

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-2">
        <span className={cn("inline-block h-2 w-2 rounded-full", dotColor)} />
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          {label}
        </p>
      </div>
      <p className="mt-2 text-lg font-semibold text-[var(--text)]">{value}</p>
      {detail && (
        <p className="mt-0.5 text-xs text-[var(--muted)]">{detail}</p>
      )}
    </div>
  );
}

function HealthRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: string;
  detail?: string;
}) {
  const isOk = status === "ok" || status === "healthy" || status === "up";
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5 last:border-b-0">
      <span className="text-sm text-[var(--text)]">{label}</span>
      <div className="flex items-center gap-2">
        {detail && (
          <span className="text-xs text-[var(--muted)]">{detail}</span>
        )}
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            isOk
              ? "bg-[var(--ok-subtle)] text-[var(--ok)]"
              : "bg-[var(--warn)]/10 text-[var(--warn)]",
          )}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

function OverviewPage() {
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useGatewayQuery<StatusSummary>("status.summary", undefined, {
    refetchInterval: 10_000,
  });

  const {
    data: health,
    isLoading: healthLoading,
  } = useGatewayQuery<HealthSnapshot>("health.snapshot", undefined, {
    refetchInterval: 10_000,
  });

  const isOnline = summary ? Boolean(summary.online ?? summary.status === "ok") : false;
  const uptimeMs = summary?.uptimeMs as number | undefined;
  const channels = (summary?.channels as number) ?? (summary?.activeChannels as number) ?? 0;
  const sessions = (summary?.sessions as number) ?? (summary?.activeSessions as number) ?? 0;
  const startedAt = summary?.startedAt as number | undefined;
  const version = summary?.version as string | undefined;

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Gateway status, entry points, and a fast health read."
      />

      {summaryError && (
        <div className="mb-4 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-3">
          <p className="text-sm text-[var(--destructive)]">
            Failed to fetch status: {summaryError.message}
          </p>
        </div>
      )}

      {summaryLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)]"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            label="Status"
            value={isOnline ? "Online" : "Offline"}
            detail={version ? `v${version}` : undefined}
            variant={isOnline ? "ok" : "error"}
          />
          <StatusCard
            label="Uptime"
            value={uptimeMs ? formatDurationMs(uptimeMs) : "n/a"}
            detail={startedAt ? `since ${formatAgo(startedAt)}` : undefined}
            variant="default"
          />
          <StatusCard
            label="Channels Active"
            value={String(channels)}
            variant={channels > 0 ? "ok" : "warn"}
          />
          <StatusCard
            label="Active Sessions"
            value={String(sessions)}
            variant={sessions > 0 ? "ok" : "default"}
          />
        </div>
      )}

      {/* Health details */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">
          Health Checks
        </h2>
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
          {healthLoading ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--muted)]">
              Loading health data...
            </div>
          ) : health && typeof health === "object" ? (
            Object.keys(health).length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                No health checks reported.
              </div>
            ) : (
              Object.entries(health).map(([key, val]) => {
                const entry = val as Record<string, unknown> | string | undefined;
                let status = "unknown";
                let detail: string | undefined;
                if (typeof entry === "string") {
                  status = entry;
                } else if (entry && typeof entry === "object") {
                  status = String(entry.status ?? entry.state ?? "unknown");
                  detail = entry.detail as string | undefined;
                }
                return (
                  <HealthRow key={key} label={key} status={status} detail={detail} />
                );
              })
            )
          ) : (
            <div className="px-4 py-6 text-center text-sm text-[var(--muted)]">
              No health data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/overview")({
  component: OverviewPage,
});
