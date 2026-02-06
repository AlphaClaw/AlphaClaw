import { create } from "zustand";
import { GatewayBrowserClient } from "../gateway/client";
import type { GatewayEventFrame, GatewayHelloOk } from "../gateway/protocol";
import type { PresenceEntry, HealthSnapshot, StatusSummary, AgentsListResult } from "../types/gateway";
import type { EventLogEntry, AssistantIdentity } from "../types/ui";
import { normalizeAssistantIdentity } from "../types/ui";

export type GatewayStore = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  hello: GatewayHelloOk | null;
  lastError: string | null;

  // Presence / health (push events)
  presenceEntries: PresenceEntry[];
  presenceError: string | null;
  presenceStatus: StatusSummary | null;
  debugHealth: HealthSnapshot | null;

  // Agents
  agentsList: AgentsListResult | null;
  agentsLoading: boolean;
  agentsError: string | null;

  // Assistant identity
  assistant: AssistantIdentity;

  // Event log
  eventLogBuffer: EventLogEntry[];
  eventLog: EventLogEntry[];

  // Actions
  connect: (url: string, token?: string, password?: string) => void;
  disconnect: () => void;
  setHello: (hello: GatewayHelloOk) => void;
  setConnected: (connected: boolean) => void;
  setLastError: (error: string | null) => void;
  setPresence: (entries: PresenceEntry[]) => void;
  setHealth: (health: HealthSnapshot) => void;
  setAgentsList: (result: AgentsListResult | null) => void;
  setAgentsLoading: (loading: boolean) => void;
  setAgentsError: (error: string | null) => void;
  setAssistant: (identity: Partial<AssistantIdentity>) => void;
  pushEvent: (entry: EventLogEntry) => void;
  flushEventLog: () => void;
};

export const useGatewayStore = create<GatewayStore>((set, get) => ({
  client: null,
  connected: false,
  hello: null,
  lastError: null,
  presenceEntries: [],
  presenceError: null,
  presenceStatus: null,
  debugHealth: null,
  agentsList: null,
  agentsLoading: false,
  agentsError: null,
  assistant: normalizeAssistantIdentity({}),
  eventLogBuffer: [],
  eventLog: [],

  connect: (url, token, password) => {
    const prev = get().client;
    prev?.stop();

    const client = new GatewayBrowserClient({
      url,
      token: token?.trim() || undefined,
      password: password?.trim() || undefined,
      clientName: "alphaclaw-control-ui" as any,
      mode: "webchat" as any,
      onHello: (hello) => {
        set({ connected: true, lastError: null, hello });
      },
      onClose: ({ code, reason }) => {
        set({ connected: false });
        if (code !== 1012) {
          set({ lastError: `disconnected (${code}): ${reason || "no reason"}` });
        }
      },
      onEvent: (evt) => {
        // Event dispatch handled by the root layout's subscription
        const store = get();
        store.pushEvent({ ts: Date.now(), event: evt.event, payload: evt.payload });
      },
      onGap: ({ expected, received }) => {
        set({ lastError: `event gap detected (expected seq ${expected}, got ${received}); refresh recommended` });
      },
    });
    set({ client, lastError: null, hello: null, connected: false });
    client.start();
  },

  disconnect: () => {
    get().client?.stop();
    set({ client: null, connected: false, hello: null });
  },

  setHello: (hello) => set({ hello }),
  setConnected: (connected) => set({ connected }),
  setLastError: (error) => set({ lastError: error }),
  setPresence: (entries) => set({ presenceEntries: entries, presenceError: null, presenceStatus: null }),
  setHealth: (health) => set({ debugHealth: health }),
  setAgentsList: (result) => set({ agentsList: result }),
  setAgentsLoading: (loading) => set({ agentsLoading: loading }),
  setAgentsError: (error) => set({ agentsError: error }),
  setAssistant: (identity) => set({ assistant: normalizeAssistantIdentity(identity) }),

  pushEvent: (entry) => {
    set((state) => ({
      eventLogBuffer: [entry, ...state.eventLogBuffer].slice(0, 250),
    }));
  },

  flushEventLog: () => {
    set((state) => ({ eventLog: state.eventLogBuffer }));
  },
}));
