import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useGatewayStore } from "../stores/gateway-store";

export function useGatewayQuery<T = unknown>(
  method: string,
  params?: unknown,
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">,
) {
  const client = useGatewayStore((s) => s.client);
  const connected = useGatewayStore((s) => s.connected);

  return useQuery<T, Error>({
    queryKey: [method, params],
    queryFn: async () => {
      if (!client || !connected) throw new Error("gateway not connected");
      return client.request<T>(method, params);
    },
    enabled: Boolean(client && connected) && (options?.enabled !== false),
    ...options,
  });
}
