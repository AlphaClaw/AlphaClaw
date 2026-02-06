import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FileText,
  Gauge,
  LayoutDashboard,
  MessageSquare,
  Network,
  ScrollText,
  Settings,
  Terminal,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TAB_GROUPS, type Tab } from "../utils/navigation";
import { useUiStore } from "../stores/ui-store";
import { cn } from "../lib/utils";

const iconMap: Record<Tab, LucideIcon> = {
  chat: MessageSquare,
  overview: LayoutDashboard,
  channels: Gauge,
  instances: Cpu,
  sessions: FileText,
  cron: Calendar,
  agents: Bot,
  skills: Wrench,
  nodes: Network,
  config: Settings,
  debug: Terminal,
  logs: ScrollText,
};

export function Sidebar() {
  const navCollapsed = useUiStore((s) => s.navCollapsed);
  const toggleNav = useUiStore((s) => s.toggleNav);
  const navGroupsCollapsed = useUiStore((s) => s.navGroupsCollapsed);
  const toggleNavGroup = useUiStore((s) => s.toggleNavGroup);
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-full flex-col border-r border-[var(--border)] bg-[var(--panel)] transition-all duration-200",
        navCollapsed ? "w-[56px]" : "w-[220px]",
      )}
    >
      {/* Brand */}
      <div className="flex h-12 items-center gap-2 border-b border-[var(--border)] px-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-white text-xs font-bold">
          A
        </div>
        {!navCollapsed && (
          <span className="text-sm font-semibold text-[var(--text-strong)] truncate">
            AlphaClaw
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {TAB_GROUPS.map((group) => {
          const isCollapsed = navGroupsCollapsed[group.label] ?? false;
          return (
            <div key={group.label} className="mb-1">
              {!navCollapsed && (
                <button
                  type="button"
                  onClick={() => toggleNavGroup(group.label)}
                  className="flex w-full items-center px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] hover:text-[var(--text)]"
                >
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 transition-transform",
                      !isCollapsed && "rotate-90",
                    )}
                  />
                </button>
              )}
              {(!isCollapsed || navCollapsed) &&
                group.tabs.map((tab) => {
                  const Icon = iconMap[tab as Tab];
                  const href = `/${tab}`;
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={tab}
                      to={href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md mx-2 px-2 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-medium"
                          : "text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]",
                        navCollapsed && "justify-center px-0",
                      )}
                      title={navCollapsed ? tab : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!navCollapsed && (
                        <span className="truncate capitalize">{tab === "cron" ? "Cron Jobs" : tab}</span>
                      )}
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={toggleNav}
        className="flex h-10 items-center justify-center border-t border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
      >
        {navCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
