'use client'

import { useState } from 'react'
import { addVaultItem } from '@/app/actions/vault'
import type { ImportRow } from '@/app/api/import/route'

interface ImportReviewProps {
  rows: ImportRow[]
  onDone: () => void
}

export function ImportReview({ rows, onDone }: ImportReviewProps) {
  const [items, setItems] = useState(
    rows.map((r) => ({ ...r, selected: r.confidence >= 0.5, importing: false, imported: false, error: '' }))
  )
  const [loading, setLoading] = useState(false)

  const selectedCount = items.filter((i) => i.selected && !i.imported).length

  async function handleImport() {
    setLoading(true)
    for (let i = 0; i < items.length; i++) {
      const row = items[i]
      if (!row.selected || row.imported) continue
      const result = await addVaultItem({
        category: row.matched_category,
        name: row.matched_name || row.raw_name,
        condition: row.matched_condition,
        quantity: row.matched_quantity,
        language: 'EN',
        isGraded: row.matched_condition === 'graded',
        purchasePrice: row.matched_price ?? undefined,
      })
      setItems((prev) => prev.map((it, j) => j === i ? { ...it, imported: result.success, error: result.success ? '' : 'result.error ?? Failed' } : it))
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-400">{selectedCount} rows selected</span>
        <div className="flex gap-2">
          <button onClick={onDone} className="px-4 py-1.5 bg-neutral-800 rounded-lg text-sm">Done</button>
          <button onClick={handleImport} disabled={loading || selectedCount === 0}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg text-sm">
            {loading ? 'Importing...' : `Import ${selectedCount}`}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((row, idx) => (
          <div key={idx} className="flex gap-3 p-3 rounded-xl border border-neutral-800">
            <input type="checkbox" checked={row.selected} disabled={row.imported}
              onChange={(e) => setItems((p) => p.map((it, j) => j === idx ? { ...it, selected: e.target.checked } : it))} />
            <div className="flex-1">
              <p className="text-sm font-medium">{row.matched_name || row.raw_name}</p>
              <p className="text-xs text-neutral-500">{row.matched_category} • {row.matched_condition}</p>
            </div>
            {row.imported && <span className="text-emerald-400 text-xs">✓</span>}
            {row.error && <span className="text-red-400 text-xs">{rund.error}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
