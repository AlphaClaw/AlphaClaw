import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/page-header";
import { useGatewayQuery } from "../hooks/use-gateway-query";
import { cn } from "../lib/utils";
import { formatAgo } from "../utils/format";
import type { ChannelsStatusSnapshot, ChannelAccountSnapshot } from "../types/gateway";

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        connected ? "bg-[var(--ok)]" : "bg-[var(--muted)]",
      )}
      title={connected ? "Connected" : "Disconnected"}
    />
  );
}

function AccountRow({ account }: { account: ChannelAccountSnapshot }) {
  const isConnected = Boolean(account.connected);
  const isRunning = Boolean(account.running);

  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <ConnectionDot connected={isConnected} />
        <span className="truncate text-sm text-[var(--text)]">
          {account.name || account.accountId}
        </span>
        {account.mode && (
          <span className="shrink-0 rounded bg-[var(--bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
            {account.mode}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {isRunning && (
          <span className="rounded-full bg-[var(--ok-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--ok)]">
            running
          </span>
        )}
        {isConnected && (
          <span className="rounded-full bg-[var(--ok-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--ok)]">
            connected
          </span>
        )}
        {!isConnected && !isRunning && (
          <span className="rounded-full bg-[var(--muted)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
            stopped
          </span>
        )}
        {account.lastError && (
          <span
            className="max-w-[160px] truncate text-[10px] text-[var(--destructive)]"
            title={account.lastError}
          >
            {account.lastError}
          </span>
        )}
      </div>
    </div>
  );
}

function ChannelCard({
  channelId,
  label,
  accounts,
}: {
  channelId: string;
  label: string;
  accounts: ChannelAccountSnapshot[];
}) {
  const anyConnected = accounts.some((a) => a.connected);
  const anyRunning = accounts.some((a) => a.running);

  const lastInbound = accounts.reduce<number | null>((best, a) => {
    if (!a.lastInboundAt) return best;
    return best === null ? a.lastInboundAt : Math.max(best, a.lastInboundAt);
  }, null);

  const lastOutbound = accounts.reduce<number | null>((best, a) => {
    if (!a.lastOutboundAt) return best;
    return best === null ? a.lastOutboundAt : Math.max(best, a.lastOutboundAt);
  }, null);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <ConnectionDot connected={anyConnected} />
          <h3 className="text-sm font-semibold text-[var(--text)]">{label}</h3>
          <span className="text-xs text-[var(--muted)]">({channelId})</span>
        </div>
        <div className="flex items-center gap-2">
          {anyRunning && (
            <span className="rounded-full bg-[var(--ok-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--ok)]">
              running
            </span>
          )}
          <span className="text-xs text-[var(--muted)]">
            {accounts.length} account{accounts.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--bg)] px-4 py-2">
        <div className="flex gap-6 text-[11px] text-[var(--muted)]">
          <span>
            Last inbound:{" "}
            <span className="text-[var(--text)]">{formatAgo(lastInbound)}</span>
          </span>
          <span>
            Last outbound:{" "}
            <span className="text-[var(--text)]">{formatAgo(lastOutbound)}</span>
          </span>
        </div>
      </div>

      {accounts.length > 0 && (
        <div>
          {accounts.map((account) => (
            <AccountRow key={account.accountId} account={account} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChannelsPage() {
  const { data, isLoading, error } = useGatewayQuery<ChannelsStatusSnapshot>(
    "channels.status",
    undefined,
    { refetchInterval: 5000 },
  );

  const channelIds = data?.channelOrder ?? [];
  const labels = data?.channelLabels ?? {};
  const accountsMap = data?.channelAccounts ?? {};

  return (
    <div>
      <PageHeader title="Channels" subtitle="Manage channels and settings." />

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-3">
          <p className="text-sm text-[var(--destructive)]">
            Failed to fetch channels: {error.message}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)]"
            />
          ))}
        </div>
      ) : channelIds.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            No channels configured.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {channelIds.map((id) => (
            <ChannelCard
              key={id}
              channelId={id}
              label={labels[id] ?? id}
              accounts={accountsMap[id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/channels")({
  component: ChannelsPage,
});
