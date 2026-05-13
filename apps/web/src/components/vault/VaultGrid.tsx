'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { VaultItemCard } from './VaultItemCard'
import { AddItemModal } from './AddItemModal'
import { cn, formatCurrency } from '@/lib/utils'
import type { DbVaultItem, ItemCategory } from '@grailbabe/types'

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'tcg_pokemon', label: 'Pokénon' },
  { value: 'tcg_mtg', label: 'MTG' },
  { value: 'tcg_onepiece', label: 'One Piece' },
  { value: 'lego_set', label: 'Lego' },
  { value: 'sports_card', label: 'Sports' },
]

interface VaultGridProps { items: DbVaultItem[] }

export function VaultGrid({ items }: VaultGridProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [sort, setSort] = useState('newest')

  const filtered = useMemo(() => {
    let list = activeFilter === 'all' ? items : items.filter((i) => i.category === activeFilter)
    if (sort === 'value_desc') list = [...list].sort((a, b) => (b.current_value_usd ?? 0) - (a.current_value_usd ?? 0))
    else if (sort === 'value_asc') list = [...list].sort((a, b) => (a.current_value_usd ?? 0) - (b.current_value_usd ?? 0))
    else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    else list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))
    return list
  }, [items, activeFilter, sort])

  const totalValue = items.reduce((sum, i) => sum + (i.current_value_usd ?? 0), 0)

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button key={tab.value} onClick={() => setActiveFilter(tab.value)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                activeFilter === tab.value ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700')}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-300">
            <option value="newest">Newest</option>
            <option value="value_desc">Highest value</option>
            <option value="value_asc">Lowest value</option>
            <option value="name">Name</option>
          </select>
          <button onClick={() => setModalOpen(true)}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium">
+ Add Item</button>
        </div>
      </div>
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((item) => (
            <VaultItemCard key={item.id} item={item} onDeleted={() => router.refresh()} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-neutral-500">No items yet. Add your first collectible!</p>
        </div>
      )}
      <AddItemModal open={modalOpen} onClose={() => setModalOpen(false)} onAdded={() => { setModalOpen(false); router.refresh() }} />
    </>
  )
}
