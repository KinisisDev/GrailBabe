import { NextRequest, NextResponse } from 'next/server'
import { claudeJSON } from '@/lib/claude'
import type { ItemCategory, ItemCondition } from '@grailbabe/types'

export interface ImportRow {
  raw_name:         string
  raw_set:          string
  raw_condition:    string
  raw_quantity:     string
  raw_price:        string
  raw_extra:        string   // any other columns joined
  // Claude's output
  matched_name:     string
  matched_category: ItemCategory
  matched_condition: ItemCondition
  matched_quantity:  number
  matched_price:     number | null
  confidence:        number   // 0–1
  notes:             string
}

const SYSTEM = `You are helping a collector import their collection data into GrailBabe.
You will receive CSV rows (already parsed) and must map each to GrailBabe's data model.

For each row determine:
- matched_name: the most likely official card/item name (clean up abbreviations, misspellings)
- matched_category: one of tcg_pokemon, tcg_mtg, tcg_onepiece, tcg_other, lego_set, lego_minifigure, sports_card
- matched_condition: one of raw_poor, raw_good, raw_excellent, raw_near_mint, raw_mint, graded
  (if "PSA", "BGS", "CGC", "10", "9.5" appear → use "graded")
- matched_quantity: integer quantity (default 1 if missing)
- matched_price: purchase price as a float if present, null if missing/invalid
- confidence: 0.0–1.0 confidence in the name match (1.0 = very certain, 0.3 = guessing)
- notes: any concerns, ambiguities, or extra info extracted from the row

Return a JSON array with one object per input row, in the SAME ORDER as the input.`

function parseCSV(text: string): string[][] {
  const lines = text.trim().split('\n')
  return lines.map((line) => {
    const cols: string[] = []
    let inQuote = false, cur = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        cols.push(cur.trim()); cur = ''
      } else {
        cur += ch
      }
    }
    cols.push(cur.trim())
    return cols
  })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const text = await file.text()
    const rows = parseCSV(text)
    if (rows.length < 2) return NextResponse.json({ error: 'CSV has no data rows' }, { status: 400 })

    // Auto-detect header
    const headerRow = rows[0]
    const dataRows  = rows.slice(1).filter((r) => r.some((c) => c.length > 0))

    if (dataRows.length > 200) {
      return NextResponse.json({ error: 'Maximum 200 rows per import. Split your file and re-upload.' }, { status: 400 })
    }

    // Map columns by header (best-effort)
    const hdr = headerRow.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
    const col = (names: string[]) => names.reduce((found, n) => found !== -1 ? found : hdr.indexOf(n), -1)

    const nameIdx = col(['name', 'cardname', 'item', 'title'])
    const setIdx  = col(['set', 'setname', 'series', 'edition'])
    const condIdx = col(['condition', 'cond', 'grade'])
    const qtyIdx  = col(['quantity', 'qty', 'count'])
    const priceIdx = col(['price', 'purchaseprice', 'cost', 'paid'])

    const rawRows: ImportRow[] = dataRows.map((r) => ({
      raw_name:      nameIdx  >= 0 ? r[nameIdx]  ?? '' : r[0] ?? '',
      raw_set:       setIdx   >= 0 ? r[setIdx]   ?? '' : r[1] ?? '',
      raw_condition: condIdx  >= 0 ? r[condIdx]  ?? '' : '',
      raw_quantity:  qtyIdx   >= 0 ? r[qtyIdx]   ?? '' : '',
      raw_price:     priceIdx >= 0 ? r[priceIdx] ?? '' : '',
      raw_extra:     r.filter((_, i) => ![nameIdx, setIdx, condIdx, qtyIdx, priceIdx].includes(i)).join(' | '),
      // Placeholders — Claude fills these
      matched_name:      '', matched_category: 'tcg_other',
      matched_condition: 'raw_near_mint', matched_quantity: 1,
      matched_price: null, confidence: 0, notes: '',
    }))

    // Send to Claude in batches of 30
    const BATCH = 30
    const results: ImportRow[] = []

    for (let i = 0; i < rawRows.length; i += BATCH) {
      const batch = rawRows.slice(i, i + BATCH)
      const input = batch.map((r, idx) =>
        `Row ${i + idx + 1}: name="${r.raw_name}" | set="${r.raw_set}" | condition="${r.raw_condition}" | qty="${r.raw_quantity}" | price="${r.raw_price}" | extra="${r.raw_extra}"`
      ).join('\n')

      const matched = await claudeJSON<Omit<ImportRow, 'raw_name'|'raw_set'|'raw_condition'|'raw_quantity'|'raw_price'|'raw_extra'>[]>(
        SYSTEM, input, 3000
      )

      matched.forEach((m, idx) => {
        results.push({ ...batch[idx], ...m })
      })
    }

    return NextResponse.json({ rows: results, total: results.length })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
