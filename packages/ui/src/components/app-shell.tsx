import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useUiStore } from "../stores/ui-store";
import { cn } from "../lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const navCollapsed = useUiStore((s) => s.navCollapsed);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar />
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden transition-all duration-200",
          navCollapsed ? "ml-[56px]" : "ml-[220px]",
        )}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
