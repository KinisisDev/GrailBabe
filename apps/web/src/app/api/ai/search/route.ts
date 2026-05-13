import { NextRequest, NextResponse } from 'next/server'
import { claudeJSON } from '@/lib/claude'
import type { ItemCategory } from '@grailbabe/types'

interface SearchInterpretation {
  category:      ItemCategory
  search_query:  string
  is_vault_search: boolean
  reasoning:     string
}

interface SearchResult {
  id:       string
  name:     string
  imageUrl?: string
  setName?: string
  number?:  string
  rarity?:  string
}

const SYSTEM = `You are an expert collectibles cataloger for GrailBabe — a platform covering
Pokémon TCG, Magic: The Gathering, One Piece TCG, Lego sets/minifigures, and sports cards.

Your job is to interpret a user's natural language search query and extract:
1. The most likely item category
2. The best search string to pass to a catalog API
3. Whether the user seems to be asking about items they already own

Categories:
- tcg_pokemon — Pokémon TCG cards
- tcg_mtg — Magic: The Gathering cards  
- tcg_onepiece — One Piece TCG cards
- tcg_other — other trading cards
- lego_set — Lego sets
- lego_minifigure — Lego minifigures
- sports_card — sports cards (NBA, NFL, MLB, etc.)

Return JSON: { category, search_query, is_vault_search, reasoning }`

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    if (!query?.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const interpretation = await claudeJSON<SearchInterpretation>(
      SYSTEM,
      `User query: "${query}"`
    )

    const apiBase = process.env.NEXT_PUBLIC_API_SERVER_URL ?? 'http://localhost:3001'
    const q = encodeURIComponent(interpretation.search_query)
    let results: SearchResult[] = []

    // Hit the right endpoint based on interpreted category
    try {
      if (interpretation.category === 'tcg_pokemon') {
        const r = await fetch(`${apiBase}/api/pokemon/cards?q=name:${q}&pageSize=20`)
        const j = await r.json()
        results = (j?.data?.data ?? []).map((c: any) => ({
          id: c.id, name: c.name,
          imageUrl: c.images?.small ?? c.images?.large,
          setName: c.set?.name, number: c.number, rarity: c.rarity,
        }))
      } else if (interpretation.category === 'tcg_mtg') {
        const r = await fetch(`${apiBase}/api/scryfall/cards?q=${q}`)
        const j = await r.json()
        results = (j?.data?.data ?? []).map((c: any) => ({
          id: c.id, name: c.name,
          imageUrl: c.image_uris?.small ?? c.image_uris?.normal,
          setName: c.set_name, number: c.collector_number, rarity: c.rarity,
        }))
      } else if (interpretation.category === 'tcg_onepiece') {
        const r = await fetch(`${apiBase}/api/tcgapi/cards?q=${q}`)
        const j = await r.json()
        results = (j?.data?.cards ?? j?.data?.data ?? []).map((c: any) => ({
          id: c.id ?? c.productId, name: c.name,
          imageUrl: c.image ?? c.imageUrl,
          setName: c.set ?? c.setName, number: c.number ?? c.cardNumber,
        }))
      } else if (interpretation.category === 'lego_set' || interpretation.category === 'lego_minifigure') {
        const r = await fetch(`${apiBase}/api/rebrickable/sets?q=${q}`)
        const j = await r.json()
        results = (j?.data?.results ?? []).map((s: any) => ({
          id: s.set_num, name: s.name,
          imageUrl: s.set_img_url,
          setName: `${s.year} · ${s.num_parts ?? '?'} parts`,
          number: s.set_num,
        }))
      } else if (interpretation.category === 'sports_card') {
        const r = await fetch(`${apiBase}/api/cardhedger/cards?q=${q}`)
        const j = await r.json()
        results = (j?.data?.cards ?? j?.data ?? []).map((c: any) => ({
          id: c.id ?? c.cardId, name: c.name ?? c.playerName,
          imageUrl: c.imageUrl ?? c.image,
          setName: c.set ?? c.setName, number: c.number ?? c.cardNumber,
        }))
      }
    } catch (fetchErr) {
      // Return interpretation even if catalog fetch fails
      console.error('Catalog fetch failed:', fetchErr)
    }

    return NextResponse.json({ interpretation, results })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
