import { useCallback, useEffect } from "react";
import { useChatStore } from "../stores/chat-store";
import { useGatewayStore } from "../stores/gateway-store";
import { useUiStore } from "../stores/ui-store";
import { useGatewayEvent } from "../hooks/use-gateway-event";
import { ChatMessageList } from "./chat-message-list";
import { ChatInput } from "./chat-input";
import { stripThinkingTags } from "../utils/format";

export function ChatPage() {
  const client = useGatewayStore((s) => s.client);
  const connected = useGatewayStore((s) => s.connected);
  const sessionKey = useUiStore((s) => s.settings.sessionKey);
  const setChatMessages = useChatStore((s) => s.setChatMessages);
  const setChatLoading = useChatStore((s) => s.setChatLoading);
  const setChatStream = useChatStore((s) => s.setChatStream);
  const setChatStreamStartedAt = useChatStore((s) => s.setChatStreamStartedAt);
  const setChatRunId = useChatStore((s) => s.setChatRunId);
  const setChatSending = useChatStore((s) => s.setChatSending);
  const resetStreaming = useChatStore((s) => s.resetStreaming);
  const updateToolStream = useChatStore((s) => s.updateToolStream);
  const resetToolStream = useChatStore((s) => s.resetToolStream);
  const dequeue = useChatStore((s) => s.dequeue);

  // Load chat history on connect
  useEffect(() => {
    if (!client || !connected) return;
    setChatLoading(true);
    client
      .request<{ messages: unknown[] }>("chat.history", { sessionKey })
      .then((res) => {
        setChatMessages(res?.messages ?? []);
      })
      .catch(() => {
        setChatMessages([]);
      })
      .finally(() => {
        setChatLoading(false);
      });
  }, [client, connected, sessionKey, setChatMessages, setChatLoading]);

  // Process queue
  const processQueue = useCallback(() => {
    const item = dequeue();
    if (!item || !client || !connected) return;

    setChatSending(true);
    resetToolStream();

    const params: Record<string, unknown> = {
      sessionKey,
      message: item.text,
    };
    if (item.attachments && item.attachments.length > 0) {
      params.attachments = item.attachments.map((a) => ({
        data: a.dataUrl,
        mimeType: a.mimeType,
      }));
    }

    client
      .request<{ runId?: string }>("chat.send", params)
      .then((res) => {
        if (res?.runId) setChatRunId(res.runId);
      })
      .catch(() => {})
      .finally(() => {
        setChatSending(false);
      });
  }, [client, connected, sessionKey, dequeue, setChatSending, setChatRunId, resetToolStream]);

  // Queue watcher
  const chatQueue = useChatStore((s) => s.chatQueue);
  const chatSending = useChatStore((s) => s.chatSending);
  const chatStream = useChatStore((s) => s.chatStream);

  useEffect(() => {
    if (chatQueue.length > 0 && !chatSending && chatStream === null) {
      processQueue();
    }
  }, [chatQueue.length, chatSending, chatStream, processQueue]);

  // Event handlers
  useGatewayEvent(
    ["chat.stream", "chat.stream.delta", "chat.stream.final", "chat.message", "agent.tool.start", "agent.tool.end"],
    useCallback(
      (evt) => {
        const payload = evt.payload as Record<string, unknown> | undefined;

        switch (evt.event) {
          case "chat.stream":
          case "chat.stream.delta": {
            const text = typeof payload?.text === "string" ? payload.text : "";
            const stripped = stripThinkingTags(text);
            setChatStream(stripped);
            if (!useChatStore.getState().chatStreamStartedAt) {
              setChatStreamStartedAt(Date.now());
            }
            break;
          }
          case "chat.stream.final": {
            resetStreaming();
            // Reload history to get the final version
            if (client && connected) {
              client
                .request<{ messages: unknown[] }>("chat.history", { sessionKey })
                .then((res) => setChatMessages(res?.messages ?? []))
                .catch(() => {});
            }
            break;
          }
          case "chat.message": {
            if (payload?.message) {
              setChatMessages([...useChatStore.getState().chatMessages, payload.message as unknown]);
            }
            break;
          }
          case "agent.tool.start": {
            const toolCallId = typeof payload?.toolCallId === "string" ? payload.toolCallId : "";
            if (toolCallId) {
              updateToolStream(toolCallId, {
                name: typeof payload?.name === "string" ? payload.name : "tool",
                args: payload?.args,
                runId: typeof payload?.runId === "string" ? payload.runId : "",
                startedAt: Date.now(),
              });
            }
            break;
          }
          case "agent.tool.end": {
            const toolCallId = typeof payload?.toolCallId === "string" ? payload.toolCallId : "";
            if (toolCallId) {
              updateToolStream(toolCallId, {
                output: typeof payload?.output === "string" ? payload.output : JSON.stringify(payload?.output ?? ""),
              });
            }
            break;
          }
        }
      },
      [
        client,
        connected,
        sessionKey,
        setChatStream,
        setChatStreamStartedAt,
        setChatMessages,
        resetStreaming,
        updateToolStream,
      ],
    ),
  );

  return (
    <div className="flex h-full flex-col -m-4 md:-m-6">
      <ChatMessageList />
      <ChatInput />
    </div>
  );
}
