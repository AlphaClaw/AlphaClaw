import { useMutation, type UseMutationOptions, useQueryClient } from "@tanstack/react-query";
import { useGatewayStore } from "../stores/gateway-store";

export function useGatewayMutation<TParams = unknown, TResult = unknown>(
  method: string,
  options?: Omit<UseMutationOptions<TResult, Error, TParams>, "mutationFn"> & {
    invalidates?: string[];
  },
) {
  const client = useGatewayStore((s) => s.client);
  const queryClient = useQueryClient();

  return useMutation<TResult, Error, TParams>({
    mutationFn: async (params: TParams) => {
      if (!client) throw new Error("gateway not connected");
      return client.request<TResult>(method, params);
    },
    onSuccess: (...args) => {
      if (options?.invalidates) {
        for (const key of options.invalidates) {
          queryClient.invalidateQueries({ queryKey: [key] });
        }
      }
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
