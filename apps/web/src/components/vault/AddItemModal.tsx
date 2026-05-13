'use client'

import { useState, useCallback, useTransition } from 'react'
import Image from 'next/image'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { addVaultItem, type AddVaultItemInput } from '@/app/actions/vault'
import type { ItemCategory, ItemCondition } from '@grailbabe/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ItemCategory; label: string; emoji: string }[] = [
  { value: 'tcg_pokemon',     label: 'Pokémon',    emoji: '🔴' },
  { value: 'tcg_mtg',         label: 'MTG',         emoji: '⚔️' },
  { value: 'tcg_onepiece',    label: 'One Piece',   emoji: '☠️' },
  { value: 'lego_set',        label: 'Lego Set',    emoji: '🧱' },
  { value: 'lego_minifigure', label: 'Minifigure',  emoji: '👷' },
  { value: 'sports_card',     label: 'Sports Card', emoji: '🏆' },
]

const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: 'raw_poor',      label: 'Poor'      },
  { value: 'raw_good',      label: 'Good'      },
  { value: 'raw_excellent', label: 'Excellent' },
  { value: 'raw_near_mint', label: 'Near Mint' },
  { value: 'raw_mint',      label: 'Mint'      },
  { value: 'graded',        label: 'Graded'    },
]

type Step = 'search' | 'details'

interface SearchResult {
  id: string
  name: string
  imageUrl?: string
  setName?: string
  number?: string
  rarity?: string
}

// ─── API search helpers ───────────────────────────────────────────────────────

async function searchCards(
  category: ItemCategory,
  query: string
): Promise<SearchResult[]> {
  const apiBase = process.env.NEXT_PUBLIC_API_SERVER_URL ?? 'http://localhost:3001'
  const q = encodeURIComponent(query)

  try {
    if (category === 'tcg_pokemon') {
      const res = await fetch(`${apiBase}/api/pokemon/cards?q=${q}&pageSize=20`)
      const json = await res.json()
      const cards = json?.data?.data ?? []
      return cards.map((c: any) => ({
        id:       c.id,
        name:     c.name,
        imageUrl: c.images?.small ?? c.images?.large,
        setName:  c.set?.name,
        number:   c.number,
        rarity:   c.rarity,
      }))
    }

    if (category === 'tcg_mtg') {
      const res = await fetch(`${apiBase}/api/scryfall/cards?q=${q}`)
      const json = await res.json()
      const cards = json?.data?.data ?? []
      return cards.map((c: any) => ({
        id:       c.id,
        name:     c.name,
        imageUrl: c.image_uris?.small ?? c.image_uris?.normal,
        setName:  c.set_name,
        number:   c.collector_number,
        rarity:   c.rarity,
      }))
    }

    if (category === 'tcg_onepiece') {
      const res = await fetch(`${apiBase}/api/tcgapi/cards?q=${q}`)
      const json = await res.json()
      const cards = json?.data?.cards ?? json?.data?.data ?? []
      return cards.map((c: any) => ({
        id:       c.id ?? c.productId,
        name:     c.name,
        imageUrl: c.image ?? c.imageUrl,
        setName:  c.set ?? c.setName,
        number:   c.number ?? c.cardNumber,
        rarity:   c.rarity,
      }))
    }

    if (category === 'lego_set' || category === 'lego_minifigure') {
      const res = await fetch(`${apiBase}/api/rebrickable/sets?q=${q}`)
      const json = await res.json()
      const sets = json?.data?.results ?? []
      return sets.map((s: any) => ({
        id:       s.set_num,
        name:     s.name,
        imageUrl: s.set_img_url,
        setName:  `${s.year ?? ''} · ${s.num_parts ?? '?'} parts`,
        number:   s.set_num,
      }))
    }

    if (category === 'sports_card') {
      const res = await fetch(`${apiBase}/api/cardhedger/cards?q=${q}`)
      const json = await res.json()
      const cards = json?.data?.cards ?? json?.data ?? []
      return cards.map((c: any) => ({
        id:       c.id ?? c.cardId,
        name:     c.name ?? c.playerName,
        imageUrl: c.imageUrl ?? c.image,
        setName:  c.set ?? c.setName,
        number:   c.number ?? c.cardNumber,
      }))
    }

    return []
  } catch {
    return []
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AddItemModalProps {
  open: boolean
  onClose: () => void
  onAdded?: () => void
}

export function AddItemModal({ open, onClose, onAdded }: AddItemModalProps) {
  const [step,     setStep]     = useState<Step>('search')
  const [category, setCategory] = useState<ItemCategory>('tcg_pokemon')
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [isPending, startTransition] = useTransition()

  // ─── Details form state
  const [condition,       setCondition]       = useState<ItemCondition>('raw_near_mint')
  const [quantity,        setQuantity]        = useState(1)
  const [language,        setLanguage]        = useState('EN')
  const [isGraded,        setIsGraded]        = useState(false)
  const [grader,          setGrader]          = useState('')
  const [grade,           setGrade]           = useState('')
  const [certNumber,      setCertNumber]      = useState('')
  const [purchasePrice,   setPurchasePrice]   = useState('')
  const [purchaseDate,    setPurchaseDate]    = useState('')
  const [purchasePlatform,setPurchasePlatform] = useState('')
  const [notes,           setNotes]           = useState('')
  const [isGrail,         setIsGrail]         = useState(false)
  const [grailTarget,     setGrailTarget]     = useState('')
  const [submitError,     setSubmitError]     = useState('')

  const resetState = useCallback(() => {
    setStep('search')
    setQuery('')
    setResults([])
    setSelected(null)
    setSearching(false)
    setCondition('raw_near_mint')
    setQuantity(1)
    setLanguage('EN')
    setIsGraded(false)
    setGrader('')
    setGrade('')
    setCertNumber('')
    setPurchasePrice('')
    setPurchaseDate('')
    setPurchasePlatform('')
    setNotes('')
    setIsGrail(false)
    setGrailTarget('')
    setSubmitError('')
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    const res = await searchCards(category, query.trim())
    setResults(res)
    setSearching(false)
  }

  function handleSelectCard(card: SearchResult) {
    setSelected(card)
    setStep('details')
  }

  function handleManualEntry() {
    setSelected({
      id:      `manual-${Date.now()}`,
      name:    query.trim() || 'Untitled Item',
      setName: undefined,
    })
    setStep('details')
  }

  async function handleSubmit() {
    if (!selected) return
    setSubmitError('')

    const input: AddVaultItemInput = {
      category,
      name:              selected.name,
      cardNumber:        selected.number,
      setName:           selected.setName,
      imageUrl:          selected.imageUrl,
      condition:         isGraded ? 'graded' : condition,
      quantity,
      language,
      isGraded,
      grader:            isGraded && grader ? grader as any : undefined,
      grade:             isGraded && grade ? grade : undefined,
      certNumber:        isGraded && certNumber ? certNumber : undefined,
      purchasePrice:     purchasePrice ? parseFloat(purchasePrice) : undefined,
      purchaseCurrency:  'USD',
      purchaseDate:      purchaseDate || undefined,
      purchasePlatform:  purchasePlatform || undefined,
      notes:             notes || undefined,
      isGrail,
      grailTargetPrice:  isGrail && grailTarget ? parseFloat(grailTarget) : undefined,
    }

    startTransition(async () => {
      const result = await addVaultItem(input)
      if (result.success) {
        onAdded?.()
        handleClose()
      } else {
        setSubmitError(result.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add to Vault" size="xl">
      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto px-6 py-3 border-b border-neutral-800 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => { setCategory(cat.value); setResults([]) }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              category === cat.value
                ? 'bg-indigo-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            )}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* ── STEP 1: Search ──────────────────────────────────────────────── */}
      {step === 'search' && (
        <div className="p-6 flex flex-col gap-4">
          {/* Search input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by card name, set, or player…"
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors"
            >
              {searching ? '…' : 'Search'}
            </button>
          </div>

          {/* Results grid */}
          {results.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[380px] overflow-y-auto">
              {results.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleSelectCard(card)}
                  className="flex flex-col gap-1.5 p-1.5 rounded-xl border border-neutral-800 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all text-left"
                >
                  <div className="aspect-[3/4] bg-neutral-800 rounded-lg overflow-hidden flex items-center justify-center">
                    {card.imageUrl ? (
                      <Image
                        src={card.imageUrl}
                        alt={card.name}
                        width={150}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">🃏</span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium leading-tight line-clamp-2 px-0.5">
                    {card.name}
                  </p>
                  {card.number && (
                    <p className="text-[10px] text-neutral-500 px-0.5">#{card.number}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {results.length === 0 && query && !searching && (
            <p className="text-center text-neutral-500 text-sm py-8">
              No results — try a different name or add it manually.
            </p>
          )}

          {/* Manual entry fallback */}
          {(results.length === 0 && query) && (
            <div className="text-center">
              <button
                onClick={handleManualEntry}
                className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                Add "{query}" manually →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Details ─────────────────────────────────────────────── */}
      {step === 'details' && selected && (
        <div className="p-6 flex gap-6">
          {/* Card preview */}
          <div className="hidden sm:flex flex-col items-center gap-2 w-32 flex-shrink-0">
            <div className="w-28 aspect-[3/4] bg-neutral-800 rounded-xl overflow-hidden flex items-center justify-center">
              {selected.imageUrl ? (
                <Image
                  src={selected.imageUrl}
                  alt={selected.name}
                  width={112}
                  height={150}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl">🃏</span>
              )}
            </div>
            <p className="text-xs text-center font-medium leading-tight">{selected.name}</p>
            {selected.setName && (
              <p className="text-[10px] text-neutral-500 text-center">{selected.setName}</p>
            )}
          </div>

          {/* Form */}
          <div className="flex-1 flex flex-col gap-4 max-h-[480px] overflow-y-auto pr-1">

            {/* Condition + Qty row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Condition</label>
                <select
                  value={isGraded ? 'graded' : condition}
                  onChange={(e) => {
                    if (e.target.value === 'graded') setIsGraded(true)
                    else { setIsGraded(false); setCondition(e.target.value as ItemCondition) }
                  }}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Grading details */}
            {isGraded && (
              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-neutral-800/50 border border-neutral-700">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Grader</label>
                  <select
                    value={grader}
                    onChange={(e) => setGrader(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select</option>
                    {['PSA', 'BGS', 'CGC', 'SGC', 'AGS', 'OTHER'].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Grade</label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="10, 9.5…"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Cert #</label>
                  <input
                    type="text"
                    value={certNumber}
                    onChange={(e) => setCertNumber(e.target.value)}
                    placeholder="12345678"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Language */}
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              >
                {['EN', 'JP', 'DE', 'FR', 'IT', 'ES', 'PT', 'KO', 'ZH'].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Purchase info */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Platform</label>
                <input
                  type="text"
                  value={purchasePlatform}
                        onChange={(e) => setPurchasePlatform(e.target.value)}
                  placeholder="eBay, LCS…"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Grail toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setIsGrail((v) => !v)}
                className={cn(
                  'relative w-10 h-5 rounded-full transition-colors',
                  isGrail ? 'bg-yellow-500' : 'bg-neutral-700'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                    isGrail && 'translate-x-5'
                  )}
                />
              </div>
              <span className="text-sm text-neutral-300">Add to Grail List ✨</span>
            </label>

            {isGrail && (
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">
                  Price alert target (notify me when it drops to…)
                </label>
                <div className="relative w-40">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={grailTarget}
                    onChange={(e) => setGrailTarget(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {submitError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {submitError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800">
        <button
          onClick={step === 'search' ? handleClose : () => setStep('search')}
          className="text-sm text-neutral-400 hover:text-white transition-colors"
        >
          {step === 'search' ? 'Cancel' : '← Back'}
        </button>

        {step === 'details' && (
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {isPending ? 'Saving…' : 'Add to Vault'}
          </button>
        )}
      </div>
    </Modal>
  )
}
