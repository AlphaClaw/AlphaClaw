import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/page-header";
import { useGatewayQuery } from "../hooks/use-gateway-query";
import { useGatewayMutation } from "../hooks/use-gateway-mutation";
import { cn } from "../lib/utils";
import type { ConfigSnapshot } from "../types/gateway";
import { useState, useEffect } from "react";

type ConfigTab = "parsed" | "raw";

function ConfigIssueBanner({ issues }: { issues: Array<{ path: string; message: string }> }) {
  return (
    <div className="mb-4 rounded-lg border border-[var(--warn)]/30 bg-[var(--warn)]/5 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--warn)]">
        Config Issues ({issues.length})
      </p>
      <ul className="space-y-1">
        {issues.map((issue, i) => (
          <li key={i} className="text-xs text-[var(--warn)]">
            <span className="font-mono font-medium">{issue.path}</span>
            {" - "}
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfigPage() {
  const { data, isLoading, error } = useGatewayQuery<ConfigSnapshot>("config.get");

  const saveMutation = useGatewayMutation<{ raw: string; hash?: string }>("config.set", {
    invalidates: ["config.get"],
  });

  const [activeTab, setActiveTab] = useState<ConfigTab>("parsed");
  const [rawText, setRawText] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.raw != null) {
      setRawText(data.raw);
      setIsDirty(false);
    }
  }, [data?.raw]);

  const handleRawChange = (value: string) => {
    setRawText(value);
    setIsDirty(value !== (data?.raw ?? ""));
  };

  const handleSave = () => {
    saveMutation.mutate({ raw: rawText, hash: data?.hash ?? undefined });
  };

  const parsedJson = data?.parsed ?? data?.config;
  const formattedJson = parsedJson
    ? JSON.stringify(parsedJson, null, 2)
    : null;

  const issues = data?.issues ?? [];

  return (
    <div>
      <PageHeader
        title="Config"
        subtitle="Edit ~/.alphaclaw/alphaclaw.json safely."
        actions={
          activeTab === "raw" ? (
            <button
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                isDirty
                  ? "bg-[var(--accent)] text-white hover:opacity-90"
                  : "bg-[var(--bg)] text-[var(--muted)] cursor-not-allowed",
              )}
              disabled={!isDirty || saveMutation.isPending}
              onClick={handleSave}
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-3">
          <p className="text-sm text-[var(--destructive)]">
            Failed to load config: {error.message}
          </p>
        </div>
      )}

      {saveMutation.isError && (
        <div className="mb-4 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-3">
          <p className="text-sm text-[var(--destructive)]">
            Save failed: {saveMutation.error.message}
          </p>
        </div>
      )}

      {saveMutation.isSuccess && (
        <div className="mb-4 rounded-lg border border-[var(--ok)]/30 bg-[var(--ok-subtle)] p-3">
          <p className="text-sm text-[var(--ok)]">Config saved successfully.</p>
        </div>
      )}

      {issues.length > 0 && <ConfigIssueBanner issues={issues} />}

      {/* File info */}
      {data && (
        <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
          {data.path && (
            <span>
              Path: <span className="font-mono text-[var(--text)]">{data.path}</span>
            </span>
          )}
          {data.hash && (
            <span>
              Hash: <span className="font-mono text-[var(--text)]">{data.hash.slice(0, 12)}</span>
            </span>
          )}
          {data.valid != null && (
            <span className={data.valid ? "text-[var(--ok)]" : "text-[var(--warn)]"}>
              {data.valid ? "Valid" : "Invalid"}
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-3 flex gap-1 rounded-md bg-[var(--bg)] p-0.5 w-fit border border-[var(--border)]">
        {(["parsed", "raw"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={cn(
              "rounded px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab
                ? "bg-[var(--card)] text-[var(--text)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--text)]",
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "parsed" ? "Parsed View" : "Raw Editor"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)]" />
      ) : activeTab === "parsed" ? (
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
          {formattedJson ? (
            <pre className="overflow-auto p-4 text-xs leading-relaxed text-[var(--text)] font-mono max-h-[600px]">
              {formattedJson}
            </pre>
          ) : (
            <div className="p-8 text-center text-sm text-[var(--muted)]">
              {data?.exists === false
                ? "Config file does not exist."
                : "No parsed config available."}
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <textarea
            className="block w-full resize-y bg-transparent p-4 text-xs leading-relaxed text-[var(--text)] font-mono outline-none min-h-[400px] max-h-[700px]"
            value={rawText}
            onChange={(e) => handleRawChange(e.target.value)}
            spellCheck={false}
            placeholder="Paste or edit your alphaclaw.json config here..."
          />
          {isDirty && (
            <div className="border-t border-[var(--border)] bg-[var(--bg)] px-4 py-2">
              <p className="text-[10px] text-[var(--warn)]">
                Unsaved changes. Press Save to apply.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/config")({
  component: ConfigPage,
});
