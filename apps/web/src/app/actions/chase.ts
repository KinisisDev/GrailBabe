'use server'

import { createServiceSupabaseClient } from '@/lib/supabase'
import { getActiveClerkId } from '@/lib/auth'
import { claudeJSON } from '@/lib/claude'

export interface CatalogCard {
  id: string; name: string; number: string | null; rarity: string | null; imageUrl: string | null
}

export interface SetCompletionData {
  setId: string; setName: string; category: string; total: number; owned: number; pct: number
  owned_cards: CatalogCard[]; missing_cards: CatalogCard[]
}

export interface CostToComplete {
  estimated_cost: number; confidence: 'high' | 'medium' | 'low'; notes: string; recommendation: string
  most_expensive: { name: string; estimated_price: number }[]
}

export async function getCostToComplete(setName: string, missingCards: CatalogCard[]): Promise<CostToComplete> {
  if (missingCards.length === 0) {
    return { estimated_cost: 0, confidence: 'high', notes: 'Set complete!', recommendation: 'Congratulations!', most_expensive: [] }
  }
  const prompt = `Estimate the market cost to complete the ${setName} set. Missing ${missingCards.length} cards: ${missingCards.slice(0, 20).map(c => c.name).join(', ')}. Respond with JSON: { estimated_cost: number, confidence: 'high'|'medium'|'low', notes: string, recommendation: string, most_expensive: [{name, estimated_price}] }`
  return claudeJSON(prompt)
}

export async function searchSets(category: string, query: string): Promise<{ id: string; name: string; total: number; imageUrl: string | null }[]> {
  return []
}

export async function getSetCompletion(category: string, setId: string, setName: string): Promise<SetCompletionData> {
  return { setId, setName, category, total: 0, owned: 0, pct: 0, owned_cards: [], missing_cards: [] }
}
