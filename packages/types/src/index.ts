// ─────────────────────────────────────────────────────────────────────────────
// GrailBabe — Shared TypeScript types
// ─────────────────────────────────────────────────────────────────────────────

export type ItemCategory =
  | 'tcg_pokemon'
  | 'tcg_mtg'
  | 'tcg_onepiece'
  | 'tcg_other'
  | 'lego_set'
  | 'lego_minifigure'
  | 'sports_card'

export type ItemCondition =
  | 'raw_poor'
  | 'raw_good'
  | 'raw_excellent'
  | 'raw_near_mint'
  | 'raw_mint'
  | 'graded'

export type GraderType = 'PSA' | 'BGS' | 'CGC' | 'SGC' | 'AGS' | 'OTHER'

export type PriceSource =
  | 'ebay_sold'
  | 'tcgapi'
  | 'pricecharting'
  | 'bricklink'
  | 'cardhedger'
  | 'justtcg'
  | 'pokemon_tcg'
  | 'scryfall'
  | 'manual'

// ─── Database row types ───────────────────────────────────────────────────────

export interface DbUser {
  id: string
  clerk_id: string
  email: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  is_public: boolean
  flair_id: string | null
  total_items: number
  portfolio_value_usd: number
  created_at: string
  updated_at: string
}

export interface DbVaultItem {
  id: string
  user_id: string
  category: ItemCategory
  set_item_id: string | null
  set_id: string | null
  name: string
  card_number: string | null
  set_name: string | null
  condition: ItemCondition
  quantity: number
  language: string
  is_graded: boolean
  grader: GraderType | null
  grade: string | null
  cert_number: string | null
  purchase_price: number | null
  purchase_currency: string
  purchase_date: string | null
  purchase_platform: string | null
  current_value_usd: number | null
  value_updated_at: string | null
  image_url: string | null
  notes: string | null
  tags: string[]
  is_for_trade: boolean
  is_grail: boolean
  grail_target_price: number | null
  created_at: string
  updated_at: string
}

export interface DbPriceSnapshot {
  id: string
  vault_item_id: string
  source: PriceSource
  market_price: number | null
  low_price: number | null
  high_price: number | null
  sold_price: number | null
  currency: string
  raw_data: Record<string, unknown> | null
  fetched_at: string
}

export interface DbCollection {
  id: string
  user_id: string
  name: string
  description: string | null
  cover_image_url: string | null
  is_public: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DbCollectionItem {
  id: string
  collection_id: string
  vault_item_id: string
  sort_order: number
  added_at: string
}

export interface DbSet {
  id: string
  category: ItemCategory
  name: string
  set_code: string | null
  series: string | null
  release_date: string | null
  total_items: number | null
  image_url: string | null
  source: string
  source_id: string
  raw_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface DbSetItem {
  id: string
  set_id: string
  name: string
  card_number: string | null
  rarity: string | null
  subtypes: string[]
  image_url: string | null
  image_url_hires: string | null
  source: string
  source_id: string
  raw_data: Record<string, unknown> | null
  created_at: string
}

export interface DbFlair {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  color: string | null
  is_active: boolean
  created_at: string
}

// ─── API response wrapper (matches api-server format) ─────────────────────────

export interface ApiResponse<T> {
  data: T
  source: 'cache' | 'live'
  cachedAt: string | null
}

// ─── Camel-case view models (for UI layer) ────────────────────────────────────

export interface VaultItem {
  id: string
  userId: string
  category: ItemCategory
  name: string
  cardNumber: string | null
  setName: string | null
  condition: ItemCondition
  quantity: number
  language: string
  isGraded: boolean
  grader: GraderType | null
  grade: string | null
  certNumber: string | null
  purchasePrice: number | null
  purchaseCurrency: string
  purchaseDate: string | null
  currentValueUsd: number | null
  imageUrl: string | null
  notes: string | null
  tags: string[]
  isForTrade: boolean
  isGrail: boolean
  grailTargetPrice: number | null
  createdAt: string
  updatedAt: string
}

export interface Collection {
  id: string
  userId: string
  name: string
  description: string | null
  coverImageUrl: string | null
  isPublic: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}
