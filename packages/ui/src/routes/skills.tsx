import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/page-header";
import { useGatewayQuery } from "../hooks/use-gateway-query";
import { cn } from "../lib/utils";
import type { SkillStatusReport, SkillStatusEntry } from "../types/gateway";

function MissingBadge({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[10px] font-medium uppercase text-[var(--warn)]">
        {label}:
      </span>
      {items.map((item) => (
        <span
          key={item}
          className="rounded bg-[var(--warn)]/10 px-1.5 py-0.5 text-[10px] font-mono text-[var(--warn)]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function SkillCard({ skill }: { skill: SkillStatusEntry }) {
  const hasMissing =
    skill.missing.bins.length > 0 ||
    skill.missing.env.length > 0 ||
    skill.missing.config.length > 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-[var(--card)]",
        skill.disabled
          ? "border-[var(--border)] opacity-60"
          : skill.eligible
            ? "border-[var(--border)]"
            : "border-[var(--warn)]/30",
      )}
    >
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {skill.emoji && (
              <span className="text-base shrink-0" role="img">
                {skill.emoji}
              </span>
            )}
            <h3 className="truncate text-sm font-semibold text-[var(--text)]">
              {skill.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {skill.eligible && (
              <span className="rounded-full bg-[var(--ok-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--ok)]">
                eligible
              </span>
            )}
            {skill.disabled && (
              <span className="rounded-full bg-[var(--muted)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                disabled
              </span>
            )}
            {skill.blockedByAllowlist && (
              <span className="rounded-full bg-[var(--warn)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--warn)]">
                blocked
              </span>
            )}
            {skill.always && (
              <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                always
              </span>
            )}
            {skill.bundled && (
              <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                bundled
              </span>
            )}
          </div>
        </div>

        {skill.description && (
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
            {skill.description}
          </p>
        )}

        {skill.homepage && (
          <a
            href={skill.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs text-[var(--accent)] hover:underline"
          >
            {skill.homepage}
          </a>
        )}
      </div>

      {hasMissing && (
        <div className="space-y-1 border-t border-[var(--border)] bg-[var(--bg)] px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--warn)]">
            Missing Requirements
          </p>
          <MissingBadge label="bins" items={skill.missing.bins} />
          <MissingBadge label="env" items={skill.missing.env} />
          <MissingBadge label="config" items={skill.missing.config} />
        </div>
      )}

      {skill.install.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Install options
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {skill.install.map((opt) => (
              <span
                key={opt.id}
                className="rounded bg-[var(--bg)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text)]"
                title={`${opt.kind}: ${opt.bins.join(", ")}`}
              >
                {opt.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillsPage() {
  const { data, isLoading, error } = useGatewayQuery<SkillStatusReport>(
    "skills.status",
    undefined,
    { refetchInterval: 15_000 },
  );

  const skills = data?.skills ?? [];
  const eligibleCount = skills.filter((s) => s.eligible).length;
  const disabledCount = skills.filter((s) => s.disabled).length;

  return (
    <div>
      <PageHeader
        title="Skills"
        subtitle="Manage skill availability and API key injection."
        actions={
          data ? (
            <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
              <span>
                <span className="font-medium text-[var(--text)]">{skills.length}</span>{" "}
                total
              </span>
              <span>
                <span className="font-medium text-[var(--ok)]">{eligibleCount}</span>{" "}
                eligible
              </span>
              {disabledCount > 0 && (
                <span>
                  <span className="font-medium text-[var(--muted)]">{disabledCount}</span>{" "}
                  disabled
                </span>
              )}
            </div>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-3">
          <p className="text-sm text-[var(--destructive)]">
            Failed to fetch skills: {error.message}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)]"
            />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">No skills found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {skills.map((skill) => (
            <SkillCard key={skill.skillKey} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/skills")({
  component: SkillsPage,
});
