'use client'

import { useState } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import type { DbVaultItem } from '@grailbabe/types'

interface ValuationResult {
  estimated_value:        number
  confidence:             'high' | 'medium' | 'low'
  confidence_explanation: string
  insights:               string[]
  flags:                  string[]
  recommendation:         string
}

const CONFIDENCE_STYLE: Record<string, string> = {
  high:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  low:    'text-neutral-400 bg-neutral-800 border-neutral-700',
}

interface AIValuationProps { items: DbVaultItem[] }

export function AIValuation({ items }: AIValuationProps) {
  const [result,  setResult]  = useState<ValuationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [open,    setOpen]    = useState(false)

  async function runValuation() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/valuation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            name:          i.name,
            category:      i.category,
            condition:     i.condition,
            isGraded:      i.is_graded,
            grader:        i.grader,
            grade:         i.grade,
            quantity:      i.quantity,
            purchasePrice: i.purchase_price,
            currentValue:  i.current_value_usd,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setOpen(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) return null

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <span>🤖</span> AI Valuation
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Claude analyzes your collection and gives a confidence-weighted estimate
          </p>
        </div>
        <button
          onClick={open ? () => setOpen(false) : runValuation}
          disabled={loading}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-xs font-medium transition-colors"
        >
          {loading ? 'Analyzing…' : open ? 'Refresh' : 'Run Analysis'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {result && open && (
        <div className="flex flex-col gap-4">
          {/* Estimated value + confidence */}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">AI Estimated Value</p>
              <p className="text-3xl font-bold">{formatCurrency(result.estimated_value)}</p>
            </div>
            <span className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold border capitalize',
              CONFIDENCE_STYLE[result.confidence]
            )}>
              {result.confidence} confidence
            </span>
          </div>

          <p className="text-xs text-neutral-500">{result.confidence_explanation}</p>

          {/* Insights */}
          {result.insights.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Insights</p>
              <div className="flex flex-col gap-2">
                {result.insights.map((ins, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="text-indigo-400 flex-shrink-0">▸</span>
                    <span className="text-neutral-300">{ins}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flags */}
          {result.flags.length > 0 && (
            <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
              <p className="text-xs font-semibold text-yellow-400 mb-2">⚠️ Worth checking</p>
              <div className="flex flex-col gap-1">
                {result.flags.map((flag, i) => (
                  <p key={i} className="text-xs text-neutral-400">{flag}</p>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
            <p className="text-xs font-semibold text-indigo-400 mb-1">💡 Recommendation</p>
            <p className="text-sm text-neutral-300">{result.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  )
}
