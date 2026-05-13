/**
 * useVault — fetches vault items from the web API.
 * DEV_BYPASS_AUTH=true → uses a placeholder clerk_id "dev_user".
 */
import { useCallback, useEffect, useState } from 'react';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';
const DEV_BYPASS = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true';

export interface VaultItem {
  id: string;
  name: string;
  set_name: string | null;
  set_code: string | null;
  collector_number: string | null;
  category: string;
  condition: string;
  quantity: number;
  purchase_price: number | null;
  current_value: number | null;
  image_url: string | null;
  is_grail: boolean;
  notes: string | null;
  created_at: string;
}

interface UseVaultResult {
  items: VaultItem[];
  loading: boolean;
  refreshing: boolean;
  totalValue: number;
  refresh: () => Promise<void>;
}

export function useVault(): UseVaultResult {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const clerkId = DEV_BYPASS ? 'dev_user' : 'CLERK_ID_PLACEHOLDER';
      const res = await fetch(`${WEB_URL}/api/vault?clerk_id=${clerkId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (err) {
      console.error('[useVault] fetch error:', err);
      // Keep existing items on refresh error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(false);
  }, [fetchItems]);

  const refresh = useCallback(() => fetchItems(true), [fetchItems]);

  const totalValue = items.reduce((sum, i) => sum + (i.current_value ?? 0), 0);

  return { items, loading, refreshing, totalValue, refresh };
}
