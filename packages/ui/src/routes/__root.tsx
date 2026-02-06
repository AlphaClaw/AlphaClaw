import { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "../components/app-shell";
import { useGatewayStore } from "../stores/gateway-store";
import { useUiStore } from "../stores/ui-store";
import { useThemeSync } from "../hooks/use-theme";
import { resolveInjectedAssistantIdentity } from "../types/ui";

function RootComponent() {
  useThemeSync();

  const connect = useGatewayStore((s) => s.connect);
  const setAssistant = useGatewayStore((s) => s.setAssistant);
  const gatewayUrl = useUiStore((s) => s.settings.gatewayUrl);
  const token = useUiStore((s) => s.settings.token);

  // Initialize gateway connection
  useEffect(() => {
    setAssistant(resolveInjectedAssistantIdentity());

    const basePath =
      (window as any).__ALPHACLAW_CONTROL_UI_BASE_PATH__ ?? "";
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const url = gatewayUrl || `${proto}://${location.host}${basePath}`;
    connect(url, token || undefined);
  }, [connect, setAssistant, gatewayUrl, token]);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootComponent,
});
