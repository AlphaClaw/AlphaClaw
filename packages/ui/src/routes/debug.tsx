import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { PageHeader } from "../components/page-header";
import { useGatewayStore } from "../stores/gateway-store";
import { useGatewayMutation } from "../hooks/use-gateway-mutation";
import { cn } from "../lib/utils";
import { clampText } from "../utils/format";

function DebugPage() {
  return (
    <div>
      <PageHeader
        title="Debug"
        subtitle="Gateway snapshots, events, and manual RPC calls."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <EventLogSection />
        <RpcCallerSection />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Event Log                                                          */
/* ------------------------------------------------------------------ */

function EventLogSection() {
  const eventLogBuffer = useGatewayStore((s) => s.eventLogBuffer);

  return (
    <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text-strong)]">Event Log</h2>
        <span className="text-xs tabular-nums text-[var(--muted)]">
          {eventLogBuffer.length} event{eventLogBuffer.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="h-[420px] overflow-y-auto">
        {eventLogBuffer.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[var(--muted)]">No events yet. Waiting for gateway activity...</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {eventLogBuffer.map((entry, idx) => {
              const time = new Date(entry.ts).toLocaleTimeString();
              const payloadStr = entry.payload != null
                ? clampText(JSON.stringify(entry.payload), 200)
                : null;

              return (
                <li key={`${entry.ts}-${idx}`} className="px-4 py-2.5 hover:bg-[var(--bg)]">
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--muted)]">
                      {time}
                    </span>
                    <span className="text-xs font-medium text-[var(--accent)]">
                      {entry.event}
                    </span>
                  </div>
                  {payloadStr && (
                    <pre className="mt-1 overflow-hidden text-ellipsis whitespace-pre-wrap break-all font-mono text-[10px] leading-snug text-[var(--muted)]">
                      {payloadStr}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  RPC Caller                                                         */
/* ------------------------------------------------------------------ */

function RpcCallerSection() {
  const [method, setMethod] = useState("");
  const [params, setParams] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const mutation = useGatewayMutation<unknown, unknown>(method);

  const handleSend = useCallback(() => {
    setParseError(null);
    setResponse(null);

    if (!method.trim()) {
      setParseError("Method name is required.");
      return;
    }

    let parsedParams: unknown;
    const trimmed = params.trim();
    if (trimmed === "") {
      parsedParams = undefined;
    } else {
      try {
        parsedParams = JSON.parse(trimmed);
      } catch {
        setParseError("Invalid JSON in params field.");
        return;
      }
    }

    mutation.mutate(parsedParams, {
      onSuccess: (data) => {
        setResponse(JSON.stringify(data, null, 2));
      },
      onError: (err) => {
        setResponse(`ERROR: ${err.message}`);
      },
    });
  }, [method, params, mutation]);

  return (
    <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text-strong)]">RPC Caller</h2>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {/* Method input */}
        <div>
          <label
            htmlFor="rpc-method"
            className="mb-1 block text-xs font-medium text-[var(--muted)]"
          >
            Method
          </label>
          <input
            id="rpc-method"
            type="text"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="e.g. presence.list"
            className={cn(
              "w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2",
              "font-mono text-sm text-[var(--text)]",
              "placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>

        {/* Params textarea */}
        <div>
          <label
            htmlFor="rpc-params"
            className="mb-1 block text-xs font-medium text-[var(--muted)]"
          >
            Params (JSON)
          </label>
          <textarea
            id="rpc-params"
            value={params}
            onChange={(e) => setParams(e.target.value)}
            rows={5}
            placeholder='{"key": "value"}'
            className={cn(
              "w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2",
              "font-mono text-sm text-[var(--text)] resize-y",
              "placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]",
            )}
          />
        </div>

        {parseError && (
          <p className="text-xs text-[var(--danger,red)]">{parseError}</p>
        )}

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={mutation.isPending || !method.trim()}
          className={cn(
            "self-start rounded px-4 py-2 text-sm font-medium transition-colors",
            "bg-[var(--accent)] text-white",
            "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {mutation.isPending ? "Sending..." : "Send"}
        </button>

        {/* Response block */}
        {response !== null && (
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">Response</p>
            <pre
              className={cn(
                "max-h-64 overflow-auto rounded border border-[var(--border)] bg-[var(--bg)] p-3",
                "font-mono text-xs leading-relaxed whitespace-pre-wrap break-all",
                response.startsWith("ERROR:")
                  ? "text-[var(--danger,red)]"
                  : "text-[var(--text)]",
              )}
            >
              {response}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/debug")({
  component: DebugPage,
});
