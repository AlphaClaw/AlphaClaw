import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/page-header";
import { useGatewayQuery } from "../hooks/use-gateway-query";
import { useGatewayMutation } from "../hooks/use-gateway-mutation";
import { cn } from "../lib/utils";
import { formatAgo, formatMs } from "../utils/format";
import type { CronJob, CronStatus, CronSchedule } from "../types/gateway";
import { useState } from "react";

function formatSchedule(schedule: CronSchedule): string {
  switch (schedule.kind) {
    case "at":
      return `at ${schedule.at}`;
    case "every": {
      const sec = Math.round(schedule.everyMs / 1000);
      if (sec < 60) return `every ${sec}s`;
      const min = Math.round(sec / 60);
      if (min < 60) return `every ${min}m`;
      const hr = Math.round(min / 60);
      return `every ${hr}h`;
    }
    case "cron":
      return `${schedule.expr}${schedule.tz ? ` (${schedule.tz})` : ""}`;
    default:
      return "unknown";
  }
}

function CronStatusBar({ status }: { status: CronStatus }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full",
            status.enabled ? "bg-[var(--ok)]" : "bg-[var(--muted)]",
          )}
        />
        <span className="text-sm text-[var(--text)]">
          Cron scheduler {status.enabled ? "enabled" : "disabled"}
        </span>
      </div>
      <span className="text-xs text-[var(--muted)]">
        {status.jobs} job{status.jobs !== 1 ? "s" : ""}
      </span>
      {status.nextWakeAtMs && (
        <span className="text-xs text-[var(--muted)]">
          Next wake: <span className="text-[var(--text)]">{formatAgo(status.nextWakeAtMs)}</span>
        </span>
      )}
    </div>
  );
}

function CronJobRow({ job }: { job: CronJob }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteMutation = useGatewayMutation<{ id: string }>("cron.delete", {
    invalidates: ["cron.list"],
  });

  const lastStatus = job.state?.lastStatus;
  const statusColor =
    lastStatus === "ok"
      ? "text-[var(--ok)]"
      : lastStatus === "error"
        ? "text-[var(--destructive)]"
        : lastStatus === "skipped"
          ? "text-[var(--warn)]"
          : "text-[var(--muted)]";

  return (
    <tr className="border-b border-[var(--border)] last:border-b-0">
      <td className="px-4 py-3">
        <div>
          <span className="text-sm font-medium text-[var(--text)]">{job.name}</span>
          {job.description && (
            <p className="mt-0.5 text-xs text-[var(--muted)]">{job.description}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="rounded bg-[var(--bg)] px-1.5 py-0.5 font-mono text-xs text-[var(--text)]">
          {formatSchedule(job.schedule)}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-[var(--muted)]">
        {job.sessionTarget}
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
            job.enabled
              ? "bg-[var(--ok-subtle)] text-[var(--ok)]"
              : "bg-[var(--muted)]/10 text-[var(--muted)]",
          )}
        >
          {job.enabled ? "enabled" : "disabled"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-0.5">
          {job.state?.nextRunAtMs && (
            <p className="text-xs text-[var(--muted)]">
              Next: <span className="text-[var(--text)]">{formatAgo(job.state.nextRunAtMs)}</span>
            </p>
          )}
          {job.state?.lastRunAtMs && (
            <p className="text-xs text-[var(--muted)]">
              Last: <span className="text-[var(--text)]">{formatMs(job.state.lastRunAtMs)}</span>
            </p>
          )}
          {lastStatus && (
            <p className={cn("text-xs font-medium", statusColor)}>
              {lastStatus}
              {job.state?.lastError && (
                <span
                  className="ml-1 font-normal text-[var(--destructive)]"
                  title={job.state.lastError}
                >
                  - {job.state.lastError.slice(0, 50)}
                </span>
              )}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="rounded bg-[var(--destructive)] px-2 py-1 text-[10px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              disabled={deleteMutation.isPending}
              onClick={() => {
                deleteMutation.mutate({ id: job.id });
                setConfirmDelete(false);
              }}
            >
              {deleteMutation.isPending ? "..." : "Confirm"}
            </button>
            <button
              type="button"
              className="rounded bg-[var(--bg)] px-2 py-1 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--text)]"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="rounded px-2 py-1 text-[10px] font-medium text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}

function CronPage() {
  const { data, isLoading, error } = useGatewayQuery<{
    jobs: CronJob[];
    status: CronStatus;
  }>("cron.list");

  const jobs = data?.jobs ?? [];
  const status = data?.status;

  return (
    <div>
      <PageHeader
        title="Cron Jobs"
        subtitle="Schedule wakeups and recurring agent runs."
      />

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-3">
          <p className="text-sm text-[var(--destructive)]">
            Failed to fetch cron jobs: {error.message}
          </p>
        </div>
      )}

      {status && <CronStatusBar status={status} />}

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)]" />
      ) : jobs.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">No cron jobs configured.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Name
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Schedule
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Session
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Status
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  State
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <CronJobRow key={job.id} job={job} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/cron")({
  component: CronPage,
});
