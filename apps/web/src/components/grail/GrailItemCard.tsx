'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { setGrailStatus, updateGrailTarget } from '@/app/actions/grail'
import { useRouter } from 'next/navigation'
import type { DbVaultItem } from '@grailbabe/types'

const CATEGORY_EMOJI: Record<string, string> = {
  tcg_pokemon: '🔴', tcg_mtg: '⚔️', tcg_onepiece: '☠️',
  tcg_other: '🃏', lego_set: '🧱', lego_minifigure: '👷', sports_card: '🏆',
}

interface GrailItemCardProps { item: DbVaultItem }

export function GrailItemCard({ item }: GrailItemCardProps) {
  const router = useRouter()
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState(item.grail_target_price?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [imgError, setImgError] = useState(false)

  const current = item.current_value_usd
  const target = item.grail_target_price
  const isAtTarget = current != null && target != null && current <= target

  async function handleRemoveGrail() {
    setSaving(true)
    await setGrailStatus(item.id, false)
    router.refresh()
  }

  async function handleSaveTarget() {
    const val = parseFloat(targetInput)
    if (isNaN(val) || val <= 0) return
    setSaving(true)
    await updateGrailTarget(item.id, val)
    setEditingTarget(false)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className={cn(
      'flex gap-4 bg-neutral-900 border rounded-xl p-4 transition-all',
      isAtTarget ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-neutral-800',
    )}>
      {isAtTarget && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-semibold">✨ Target hit!</span>}
      <div className="flex-1 flex flex-col gap-2">
        <p className="font-semibold text-sm">{item.name}</p>
        <div className="flex gap-3 text-sm">
          <div><p className="text-xs text-neutral-500">Current</p><p className="font-semibold">{formatCurrency(current)}</p></div>
          <div><p className="text-xs text-neutral-500">Target</p>
            {editingTarget ? (
              <div className="flex gap-1">
                <input type="number" value={targetInput} onChange={(e) => setTargetInput(e.target.value)}
                  className="w-20 bg-neutral-800 border border-neutral-700 rounded px-2 py-0.5 text-xs" autoFocus />
                <button onClick={handleSaveTarget} disabled={saving} className="text-indigo-400">{{saving ? '…' : '✓'}</button>
              </div>
            ) : (
              <button onClick={() => setEditingTarget(true)} className="font-semibold hover:text-indigo-400">
                {target ? formatCurrency(target) : 'Set target'}
              </button>
            )}
          </div>
        </div>
        <button onClick={handleRemoveGrail} disabled={saving} className="text-xs text-neutral-500 hover:text-red-400">Remove from grail list</button>
      </div>
    </div>
  )
}
