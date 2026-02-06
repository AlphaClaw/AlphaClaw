import { Moon, Sun, Monitor } from "lucide-react";
import { ConnectionStatus } from "./connection-status";
import { useUiStore } from "../stores/ui-store";
import { useGatewayStore } from "../stores/gateway-store";
import type { ThemeMode } from "../utils/storage";

const themeIcons: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const themeOrder: ThemeMode[] = ["system", "dark", "light"];

export function Topbar() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const assistant = useGatewayStore((s) => s.assistant);

  const ThemeIcon = themeIcons[theme];
  const nextTheme = themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length];

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--chrome)] px-4">
      <div className="flex items-center gap-2">
        {assistant.avatar && (
          <span className="text-base">{assistant.avatar}</span>
        )}
        <span className="text-sm font-medium text-[var(--text-strong)]">
          {assistant.name}
        </span>
      </div>

      <div className="flex-1" />

      <ConnectionStatus />

      <button
        type="button"
        onClick={() => setTheme(nextTheme)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] transition-colors"
        title={`Switch to ${nextTheme} theme`}
      >
        <ThemeIcon className="h-4 w-4" />
      </button>
    </header>
  );
}
