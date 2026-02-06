import { create } from "zustand";
import type { ChatAttachment, ChatQueueItem } from "../types/chat";
import { generateUUID } from "../utils/uuid";

export type ToolStreamEntry = {
  toolCallId: string;
  runId: string;
  sessionKey?: string;
  name: string;
  args?: unknown;
  output?: string;
  startedAt: number;
  updatedAt: number;
  message: Record<string, unknown>;
};

export type CompactionStatus = {
  active: boolean;
  startedAt: number | null;
  completedAt: number | null;
};

export type ChatStore = {
  // Messages
  chatMessages: unknown[];
  chatLoading: boolean;
  chatThinkingLevel: string | null;

  // Streaming
  chatStream: string | null;
  chatStreamStartedAt: number | null;
  chatRunId: string | null;
  chatSending: boolean;

  // Input
  chatMessage: string;
  chatAttachments: ChatAttachment[];
  chatQueue: ChatQueueItem[];

  // Tool stream
  toolStreamById: Map<string, ToolStreamEntry>;
  toolStreamOrder: string[];
  chatToolMessages: Record<string, unknown>[];

  // Compaction
  compactionStatus: CompactionStatus | null;

  // Chat avatar
  chatAvatarUrl: string | null;

  // Actions
  setChatMessages: (messages: unknown[]) => void;
  setChatLoading: (loading: boolean) => void;
  setChatStream: (stream: string | null) => void;
  setChatStreamStartedAt: (at: number | null) => void;
  setChatRunId: (id: string | null) => void;
  setChatSending: (sending: boolean) => void;
  setChatMessage: (msg: string) => void;
  setChatAttachments: (att: ChatAttachment[]) => void;
  enqueue: (text: string, attachments?: ChatAttachment[], refreshSessions?: boolean) => void;
  dequeue: () => ChatQueueItem | undefined;
  removeQueued: (id: string) => void;
  clearQueue: () => void;

  // Tool stream actions
  updateToolStream: (toolCallId: string, update: Partial<ToolStreamEntry>) => void;
  resetToolStream: () => void;
  syncToolStreamMessages: () => void;

  // Compaction
  setCompactionStatus: (status: CompactionStatus | null) => void;

  // Avatar
  setChatAvatarUrl: (url: string | null) => void;

  // Reset streaming state (on disconnect, on final)
  resetStreaming: () => void;
};

function buildToolStreamMessage(entry: ToolStreamEntry): Record<string, unknown> {
  const content: Array<Record<string, unknown>> = [];
  content.push({ type: "toolcall", name: entry.name, arguments: entry.args ?? {} });
  if (entry.output) {
    content.push({ type: "toolresult", name: entry.name, text: entry.output });
  }
  return {
    role: "assistant",
    toolCallId: entry.toolCallId,
    runId: entry.runId,
    content,
    timestamp: entry.startedAt,
  };
}

const TOOL_STREAM_LIMIT = 50;

export const useChatStore = create<ChatStore>((set, get) => ({
  chatMessages: [],
  chatLoading: false,
  chatThinkingLevel: null,
  chatStream: null,
  chatStreamStartedAt: null,
  chatRunId: null,
  chatSending: false,
  chatMessage: "",
  chatAttachments: [],
  chatQueue: [],
  toolStreamById: new Map(),
  toolStreamOrder: [],
  chatToolMessages: [],
  compactionStatus: null,
  chatAvatarUrl: null,

  setChatMessages: (messages) => set({ chatMessages: messages }),
  setChatLoading: (loading) => set({ chatLoading: loading }),
  setChatStream: (stream) => set({ chatStream: stream }),
  setChatStreamStartedAt: (at) => set({ chatStreamStartedAt: at }),
  setChatRunId: (id) => set({ chatRunId: id }),
  setChatSending: (sending) => set({ chatSending: sending }),
  setChatMessage: (msg) => set({ chatMessage: msg }),
  setChatAttachments: (att) => set({ chatAttachments: att }),

  enqueue: (text, attachments, refreshSessions) => {
    const trimmed = text.trim();
    const hasAtt = Boolean(attachments && attachments.length > 0);
    if (!trimmed && !hasAtt) return;
    set((state) => ({
      chatQueue: [
        ...state.chatQueue,
        {
          id: generateUUID(),
          text: trimmed,
          createdAt: Date.now(),
          attachments: hasAtt ? attachments?.map((a) => ({ ...a })) : undefined,
          refreshSessions,
        },
      ],
    }));
  },

  dequeue: () => {
    const state = get();
    const [next, ...rest] = state.chatQueue;
    if (!next) return undefined;
    set({ chatQueue: rest });
    return next;
  },

  removeQueued: (id) => set((s) => ({ chatQueue: s.chatQueue.filter((i) => i.id !== id) })),
  clearQueue: () => set({ chatQueue: [] }),

  updateToolStream: (toolCallId, update) => {
    set((state) => {
      const map = new Map(state.toolStreamById);
      const order = [...state.toolStreamOrder];
      let entry = map.get(toolCallId);
      if (!entry) {
        entry = {
          toolCallId,
          runId: update.runId ?? "",
          sessionKey: update.sessionKey,
          name: update.name ?? "tool",
          args: update.args,
          output: update.output,
          startedAt: update.startedAt ?? Date.now(),
          updatedAt: Date.now(),
          message: {},
        };
        map.set(toolCallId, entry);
        order.push(toolCallId);
      } else {
        entry = { ...entry, ...update, updatedAt: Date.now() };
        map.set(toolCallId, entry);
      }
      entry.message = buildToolStreamMessage(entry);

      // Trim
      if (order.length > TOOL_STREAM_LIMIT) {
        const overflow = order.length - TOOL_STREAM_LIMIT;
        const removed = order.splice(0, overflow);
        for (const id of removed) map.delete(id);
      }

      return { toolStreamById: map, toolStreamOrder: order };
    });
  },

  resetToolStream: () => set({
    toolStreamById: new Map(),
    toolStreamOrder: [],
    chatToolMessages: [],
  }),

  syncToolStreamMessages: () => {
    const state = get();
    const messages = state.toolStreamOrder
      .map((id) => state.toolStreamById.get(id)?.message)
      .filter((m): m is Record<string, unknown> => Boolean(m));
    set({ chatToolMessages: messages });
  },

  setCompactionStatus: (status) => set({ compactionStatus: status }),
  setChatAvatarUrl: (url) => set({ chatAvatarUrl: url }),

  resetStreaming: () => set({
    chatStream: null,
    chatStreamStartedAt: null,
    chatRunId: null,
  }),
}));
