export const TAB_GROUPS = [
  { label: "Chat", tabs: ["chat"] as const },
  { label: "Control", tabs: ["overview", "channels", "instances", "sessions", "cron"] as const },
  { label: "Agent", tabs: ["agents", "skills", "nodes"] as const },
  { label: "Settings", tabs: ["config", "debug", "logs"] as const },
] as const;

export type Tab =
  | "agents"
  | "overview"
  | "channels"
  | "instances"
  | "sessions"
  | "cron"
  | "skills"
  | "nodes"
  | "chat"
  | "config"
  | "debug"
  | "logs";

export function titleForTab(tab: Tab) {
  const titles: Record<Tab, string> = {
    agents: "Agents",
    overview: "Overview",
    channels: "Channels",
    instances: "Instances",
    sessions: "Sessions",
    cron: "Cron Jobs",
    skills: "Skills",
    nodes: "Nodes",
    chat: "Chat",
    config: "Config",
    debug: "Debug",
    logs: "Logs",
  };
  return titles[tab] ?? "Control";
}

export function subtitleForTab(tab: Tab) {
  const subtitles: Record<Tab, string> = {
    agents: "Manage agent workspaces, tools, and identities.",
    overview: "Gateway status, entry points, and a fast health read.",
    channels: "Manage channels and settings.",
    instances: "Presence beacons from connected clients and nodes.",
    sessions: "Inspect active sessions and adjust per-session defaults.",
    cron: "Schedule wakeups and recurring agent runs.",
    skills: "Manage skill availability and API key injection.",
    nodes: "Paired devices, capabilities, and command exposure.",
    chat: "Direct gateway chat session for quick interventions.",
    config: "Edit ~/.alphaclaw/alphaclaw.json safely.",
    debug: "Gateway snapshots, events, and manual RPC calls.",
    logs: "Live tail of the gateway file logs.",
  };
  return subtitles[tab] ?? "";
}
