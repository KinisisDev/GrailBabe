'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { deleteVaultItem } from '@/app/actions/vault'
import { PriceHistoryModal } from './PriceHistoryModal'
import type { DbVaultItem } from '@grailbabe/types'

const CONDITION_LABELS: Record<string, string> = {
  raw_poor:       'Poor',
  raw_good:       'Good',
  raw_excellent:  'Excellent',
  raw_near_mint:  'Near Mint',
  raw_mint:       'Mint',
  graded:         'Graded',
}

const CATEGORY_EMOJI: Record<string, string> = {
  tcg_pokemon:    '🔴',
  tcg_mtg:         '⚔️',
  tcg_onepiece:    '%☠️',
  tcg_other:       ''��',
  lego_set:        ''🧱',
  lego_minifigure: ''👷',
  sports_card:     ''��',
}

interface VaultItemCardProps {
  item:      DbVaultItem
  onDeleted?: () => void
}

export function VaultItemCard({ item, onDeleted }: VaultItemCardProps) {
  const [deleting,       setDeleting]       = useState(false)
  const [imgError,       setImgError]       = useState(false)
  const [historyOpen,    setHistoryOpen]    = useState(false)

  async function handleDelete() {
    if (!confirm(`Remove "${item.name}" from your vault?`)) return
    setDeleting(true)
    await deleteVaultItem(item.id)
    onDeleted?.()
  }

  const gainLoss =
    item.current_value_usd != null && item.purchase_price != null
      ? item.current_value_usd - item.purchase_price
      : null

  return (
    <>
      <div
        className={cn(
          'group relative flex flex-col bg-neutral-900 rounded-xl border border-neutral-800',
          'hover:border-neutral-600 transition-all duration-200',
          deleting && 'opacity-40 pointer-events-none'
        )}
      >
        {/* Grail badge */}
        {item.is_grail && (
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[10px] font-semibold">
             ✨ GRAIL
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-500 hover:text-red-400 hover:border-red-500/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-sm"
          title="Remove from vault"
        >
          ×
        </button>

        {/* Image */}
        <div className="aspect-[3/4] w-full bg-neutral-800 rounded-t-xl overflow-hidden flex items-center justify-center">
          {item.image_url && !imgError ? (
            <Image
              src={item.image_url}
              alt={item.name}
              width={300}
              height={400}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-5xl select-none">
              {CATEGORY_EMOJI[item.category] ?? '🃏'
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col gap-1 flex-1">
          <p className="text-sm font-medium leading-tight line-clamp-2">{item.name}</p>

          {(item.set_name || item.card_number) && (
            <p className="text-xs text-neutral-500">
              {[item.set_name, item.card_number ? `#${item.card_number}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}

          <div className="flex items-center gap-1.5 mt-auto pt-2">
            {item.is_graded ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                {item.grader} {item.grade}
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                {CONDITION_LABELS[item.condition] ?? item.condition}
              </span>
            )}
            {item.quantity > 1 && (
              <span className="text-[10px] text-neutral-500">×{item.quantity}</span>
            )}
          </div>

          {/* Value row */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setHistoryOpen(true)}
              className="text-sm font-semibold hover:text-indigo-400 transition-colors"
              title="View price history"
            >
              {item.current_value_usd != null ? formatCurrency(item.current_value_usd) : '✔'}
            </button>
            {gainLoss != null && (
              <span
                className={cn(
                  'text-[11px] font-medium',
                  gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                        {gainLoss >= 0 ? '+' : ''}
                {formatCurrency(gainLoss)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Price history modal */}
      <PriceHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        itemId={item.id}
        itemName={item.name}
      />
    </>
  )
}
