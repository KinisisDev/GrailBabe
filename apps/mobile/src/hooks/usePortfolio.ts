/**
 * usePortfolio — aggregates vault data into portfolio analytics.
 * Pulls from the web API's portfolio endpoint.
 */
import { useCallback, useEffect, useState } from 'react';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';
const DEV_BYPASS = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true';

export interface CategoryBreakdown {
  category: string;
  label: string;
  emoji: string;
  count: number;
  totalValue: number;
  percentage: number;
  color: string;
}

export interface TopMover {
  id: string;
  name: string;
  image_url: string | null;
  category: string;
  current_value: number;
  purchase_price: number;
  gain_pct: number;
  gain_abs: number;
}

export interface SparklinePoint {
  date: string;        // ISO date string
  value: number;
}

export interface PortfolioData {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPct: number;
  itemCount: number;
  grailCount: number;
  categoryBreakdown: CategoryBreakdown[];
  topGainers: TopMover[];
  topLosers: TopMover[];
  sparkline: SparklinePoint[];   // 90 days of daily snapshots (or fewer)
}

interface UsePortfolioResult {
  data: PortfolioData | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
}

export function usePortfolio(): UsePortfolioResult {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const clerkId = DEV_BYPASS ? 'dev_user' : 'CLERK_ID_PLACEHOLDER';
      const res = await fetch(`${WEB_URL}/api/portfolio?clerk_id=${clerkId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('[usePortfolio] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, refreshing, refresh };
}
