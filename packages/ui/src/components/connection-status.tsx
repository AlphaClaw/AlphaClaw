import { useGatewayStore } from "../stores/gateway-store";
import { cn } from "../lib/utils";

export function ConnectionStatus() {
  const connected = useGatewayStore((s) => s.connected);
  const lastError = useGatewayStore((s) => s.lastError);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div
        className={cn(
          "h-2 w-2 rounded-full",
          connected ? "bg-[var(--ok)]" : "bg-[var(--muted)]",
        )}
      />
      <span className={cn("text-[var(--muted)]", connected && "text-[var(--ok)]")}>
        {connected ? "Connected" : lastError ? "Error" : "Connecting…"}
      </span>
    </div>
  );
}
