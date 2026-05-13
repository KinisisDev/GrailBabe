/**
 * priceFetcher.ts
 * Maps a vault item's category + source metadata to a price from the api-server.
 * Returns a normalized PriceResult or null if the item can't be priced.
 */

import type { DbVaultItem } from '@grailbabe/types'

export interface PriceResult {
  market_price:  number | null
  low_price:     number | null
  high_price:    number | null
  sold_price:    number | null
  source:        string
  currency:      string
  raw_data:      Record<string, unknown>
}

const API_BASE = process.env.NEXT_PUBLIC_API_SERVER_URL ?? 'http://localhost:3001'

async function apiGet(path: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 0 },
    } as RequestInit)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function extractScryfallPrice(raw: Record<string, unknown>): PriceResult | null {
  const data = (raw?.data as Record<string, unknown>) ?? {}
  const prices = data.prices as Record<string, string | null> | undefined
  if (!prices) return null
  const market = prices.usd ? parseFloat(prices.usd) : null
  return { market_price: market, low_price: null, high_price: null, sold_price: null, source: 'scryfall', currency: 'USD', raw_data: raw }
}

function extractPokemonPrice(raw: Record<string, unknown>): PriceResult | null {
  const data = (raw?.data as Record<string, unknown>) ?? {}
  const tcgplayer = data.tcgplayer as Record<string, unknown> | undefined
  const prices = tcgplayer?.prices as Record<string, Record<string, number>> | undefined
  const priceObj = prices?.holofoil ?? prices?.normal ?? Object.values(prices ?? {})[0]
  if (!priceObj) return null
  return { market_price: priceObj.market ?? null, low_price: priceObj.low ?? null, high_price: priceObj.high ?? null, sold_price: null, source: 'pokemon_tcg', currency: 'USD', raw_data: raw }
}

function extractPriceChartingPrice(raw: Record<string, unknown>): PriceResult | null {
  const data = raw?.data as Record<string, unknown> | undefined
  if (!data) return null
  const loose = data['loose-price'] as number | undefined
  const complete = data['complete-price'] as number | undefined
  const market = loose ?? complete
  if (market == null) return null
  const toDollars = (v: number | undefined) => v != null ? v / 100 : null
  return { market_price: toDollars(market), low_price: null, high_price: null, sold_price: null, source: 'pricecharting', currency: 'USD', raw_data: raw }
}

export async function fetchItemPrice(item: DbVaultItem): Promise<PriceResult | null> {
  const { category, source_id, source_type } = item
  if (!source_id) return null

  switch (category) {
    case 'pokemon': {
      const raw = await apiGet(`/api/prices/pokemon/${source_id}`)
      return raw ? extractPokemonPrice(raw) : null
    }
    case 'mtg': {
      const raw = await apiGet(`/api/prices/mtg/${source_id}`)
      return raw ? extractScryfallPrice(raw) : null
    }
    case 'lego': {
      const raw = await apiGet(`/api/prices/lego/${source_id}`)
      return raw ? extractPriceChartingPrice(raw) : null
    }
    default:
      return null
  }
}
