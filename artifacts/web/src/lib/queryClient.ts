import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number } | null)?.status ?? 0;
        if (status === 401 || status === 402 || status === 404) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
