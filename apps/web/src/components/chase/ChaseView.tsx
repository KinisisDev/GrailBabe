'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { cn, formatCurrency } from '@/lib/utils'
import {
  searchSets, getSetCompletion, getCostToComplete,
  type SetCompletionData, type CostToComplete,
} from '@/app/actions/chase'

type Category = 'tcg_pokemon' | 'tcg_mtg' | 'lego_set'

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'tcg_pokemon', label: 'Pokémon',     emoji: '🔴' },
  { value: 'tcg_mtg',     label: 'MTG',         emoji: '⚔️' },
  { value: 'lego_set',    label: 'Lego',        emoji: '🧱' },
]

export function ChaseView() {
  const [category,    setCategory]    = useState<Category>('tcg_pokemon')
  const [query,       setQuery]       = useState('')
  const [setResults,  setSetResults]  = useState<{ id: string; name: string; total: number; imageUrl: string | null }[]>([])
  const [completion,  setCompletion]  = useState<SetCompletionData | null>(null)
  const [costData,    setCostData]    = useState<CostToComplete | null>(null)
  const [tab,         setTab]         = useState<'missing' | 'owned'>('missing')
  const [isPending,   startTransition] = useTransition()
  const [loadingCost, setLoadingCost] = useState(false)

  function handleSearchSets() {
    if (!query.trim()) return
    startTransition(async () => {
      const res = await searchSets(category, query)
      setSetResults(res)
      setCompletion(null)
      setCostData(null)
    })
  }

  function handleSelectSet(set: { id: string; name: string }) {
    startTransition(async () => {
      setSetResults([])
      const data = await getSetCompletion(category, set.id, set.name)
      setCompletion(data)
      setCostData(null)
    })
  }

  async function handleCostToComplete() {
    if (!completion) return
    setLoadingCost(true)
    const cost = await getCostToComplete(completion.setName, completion.missing_cards)
    setCostData(cost)
    setLoadingCost(false)
  }

  const displayCards = completion
    ? (tab === 'missing' ? completion.missing_cards : completion.owned_cards)
    : []

  return (
    <div className="flex flex-col gap-6">
      { /* Category + search */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button key={cat.value} onClick={() => { setCategory(cat.value); setSetResults([]); setCompletion(null) }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                category === cat.value ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              )}>
              <span>{cat.emoji}</span><span>{cat.label}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSets()}
            placeholder="Search for a set (e.g. Scarlet &amp; Violet, Khans of Tarkir…)"
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500" />
          <button onClick={handleSearchSets} disabled={isPending}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors">
            {isPending ? '…' : 'Search'}
          </button>
        </div>
      </div>

      { /* Set results */}
      {setResults.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {setResults.map((set) => (
            <button key={set.id} onClick={() => handleSelectSet(set)}
              className="flex flex-col items-center gap-2 p-3 bg-neutral-900 border border-neutral-800 hover:border-indigo-500 rounded-xl transition-all">
              <p className="text-xs font-medium text-center">{set.name}</p>
              <p className="text-[10px] text-neutral-500">{set.total} cards</p>
            </button>
          ))}
        </div>
      )}

      {completion && (
        <div className="flex flex-col gap-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p4">
            <h3 className="text-lg font-bold mb-2">{completion.setName}</h3>
            <p className="text-sm text-neutral-400">
              {completion.owned_cards.length} / {completion.total_cards} cards owned
            </p>
          </div>
          <div className="flex gap-2">
            {['missing', 'owned'].map((t) => (
              <button key={t} onClick={() => setTab(t as any)}
                className={cn('flex-1 py-2 rounded-lg text-sm font-medium', tab === t ? 'bg-indigo-600' : 'bg-neutral-800')}>
                {t === 'missing' ? `Missing (${completion.missing_cards.length})` : `Owned (${completion.owned_cards.length})`}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {displayCards.map((card) => (
              <div key={card.name} className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs">
                {card.name}
              </div>
            ))}
          </div>
          {tab === 'missing' && completion.missing_cards.length > 0 && (
            <button onClick={handleCostToComplete} disabled={loadingCost}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl font-medium transition-colors">
              {loadingCost ? 'Calculating with AI…' : 'Get Cost to Complete (AI)'}
            </button>
          )}
          {costData && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <h4 className="font-semibold mb-2">Cost Estimate</h4>
              <p className="text-2xl font-bold text-indigo-400">{formatCurrency(costData.totalEstimateUsd)}</p>
              <p className="text-xs text-neutral-500 mt-1">{costData.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
