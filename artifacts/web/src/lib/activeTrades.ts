import {
  useListMyTrades,
  getListMyTradesQueryKey,
} from "@workspace/api-client-react";

export function useActiveTradeVaultItemIds(): Set<number> {
  const { data } = useListMyTrades(
    { status: "all" },
    {
      query: {
        queryKey: getListMyTradesQueryKey({ status: "all" }),
        staleTime: 30_000,
      },
    },
  );
  const ids = new Set<number>();
  for (const t of data ?? []) {
    if (
      t.vaultItemId != null &&
      (t.status === "open" || t.status === "pending")
    ) {
      ids.add(t.vaultItemId);
    }
  }
  return ids;
}
