export type EventLogEntry = {
  ts: number;
  event: string;
  payload?: unknown;
};

export type AssistantIdentity = {
  agentId?: string | null;
  name: string;
  avatar: string | null;
};

export const DEFAULT_ASSISTANT_NAME = "Assistant";
export const DEFAULT_ASSISTANT_AVATAR = "A";

export function normalizeAssistantIdentity(input?: Partial<AssistantIdentity> | null): AssistantIdentity {
  const MAX_NAME = 50;
  const MAX_AVATAR = 200;
  const coerce = (v: string | undefined | null, max: number) => {
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t ? (t.length <= max ? t : t.slice(0, max)) : undefined;
  };
  const name = coerce(input?.name, MAX_NAME) ?? DEFAULT_ASSISTANT_NAME;
  const avatar = coerce(input?.avatar, MAX_AVATAR) ?? null;
  const agentId = typeof input?.agentId === "string" && input.agentId.trim() ? input.agentId.trim() : null;
  return { agentId, name, avatar };
}

export function resolveInjectedAssistantIdentity(): AssistantIdentity {
  if (typeof window === "undefined") return normalizeAssistantIdentity({});
  return normalizeAssistantIdentity({
    name: window.__ALPHACLAW_ASSISTANT_NAME__,
    avatar: window.__ALPHACLAW_ASSISTANT_AVATAR__,
  });
}
