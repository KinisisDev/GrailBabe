'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ValueChart } from '@/components/portfolio/ValueChart'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getItemPriceHistory } from '@/app/actions/vault'
import type { DbPriceSnapshot } from '@grailbabe/types'
import type { PortfolioSnapshot } from '@/app/actions/vault'

interface PriceHistoryModalProps {
  open:      boolean
  onClose:   () => void
  itemId:    string
  itemName:  string
}

export function PriceHistoryModal({ open, onClose, itemId, itemName }: PriceHistoryModalProps) {
  const [snapshots, setSnapshots] = useState<DbPriceSnapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(30)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getItemPriceHistory(itemId, days).then((data) => {
      setSnapshots(data)
      setLoading(false)
    })
  }, [open, itemId, days])

  const chartData: PortfolioSnapshot[] = snapshots
    .filter((s) => s.market_price != null)
    .map((s) => ({ day: s.fetched_at.slice(0, 10), total_value: s.market_price! }))

  const latest = snapshots.at(-1)
  const earliest = snapshots.at(0)
  const change = latest && earliest && latest.market_price && earliest.market_price
    ? latest.market_price - earliest.market_price : null

  return (
    <Modal open={open} onClose={onClose} title={`Price History — ${itemName}`} size="lg">
      <div className="p-6 flex flex-col gap-6">
        <div className="flex gap-2">
          { [7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${days === d ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
              {d}D
            </button>
          )) }
        </div>
        {loading ? (
          <div className="h-40 flex items-center justify-center text-neutral-600">Loading…</div>
        ) : (
          <ValueChart data={chartData} height={160} />
        )}
      </div>
    </Modal>
  )
}
