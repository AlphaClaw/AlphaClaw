import { useEffect, useRef } from "react";
import type { GatewayEventFrame } from "../gateway/protocol";
import { useGatewayStore } from "../stores/gateway-store";

/**
 * Subscribe to gateway WebSocket events by event name.
 * The callback is stable-ref'd so it won't cause re-subscriptions.
 */
export function useGatewayEvent(
  eventName: string | string[],
  callback: (evt: GatewayEventFrame) => void,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const client = useGatewayStore((s) => s.client);

  useEffect(() => {
    if (!client) return;
    const names = Array.isArray(eventName) ? eventName : [eventName];

    // We intercept events by patching the client's onEvent.
    // Instead, we subscribe to the store's event log and filter.
    // But that would be inefficient. Instead, let's use a direct approach.
    // The gateway store's pushEvent already captures events.
    // We'll use a zustand subscribe approach.

    const unsubscribe = useGatewayStore.subscribe((state, prev) => {
      if (state.eventLogBuffer === prev.eventLogBuffer) return;
      // New event is at index 0
      const latest = state.eventLogBuffer[0];
      if (!latest) return;
      if (!names.includes(latest.event)) return;
      callbackRef.current({
        type: "event",
        event: latest.event,
        payload: latest.payload,
      });
    });

    return unsubscribe;
  }, [client, eventName]);
}
