'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ImportReview } from '@/components/import/ImportReview'
import type { ImportRow } from '@/app/api/import/route'

export default function ImportPage() {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading,  setUploading]  = useState(false)
  const [rows,       setRows]       = useState<ImportRow[] | null>(null)
  const [error,      setError]      = useState('')

  async function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file')
      return
    }
    setUploading(true)
    setError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/import', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setRows(json.rows)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Import Collection</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Upload a CSV from TCGPlayer, TCGCSV, or any spreadsheet. Claude will match each row to the right item.
          </p>
        </div>

        {!rows ? (
          <div className="flex flex-col gap-6">
            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-neutral-700 hover:border-indigo-500 rounded-2xl py-20 cursor-pointer transition-colors"
            >
              {uploading ? (
                <>
                  <div className="text-4xl animate-pulse">🤖</div>
                  <p className="text-sm text-neutral-400">Claude is reading your collection…</p>
                </>
              ) : (
                <>
                  <div className="text-5xl">📂</div>
                  <div className="text-center">
                    <p className="font-medium">Drop your CSV here</p>
                    <p className="text-sm text-neutral-500 mt-1">or click to browse · max 200 rows</p>
                  </div>
                </>
              )}
              <input ref={inputRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            {/* CSV format guide */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">Expected CSV columns</h3>
              <p className="text-xs text-neutral-500 mb-3">
                Column names are flexible — Claude will try to match them. At minimum, include a name column.
              </p>
              <div className="font-mono text-xs bg-neutral-950 rounded-lg p-3 overflow-x-auto text-neutral-400">
                Name, Set, Condition, Quantity, Purchase Price<br />
                Charizard VMAX, Sword &amp; Shield, Near Mint, 1, 45.00<br />
                Black Lotus, Alpha, Graded PSA 8, 1, 8500.00
              </div>
            </div>

            {/* Export section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">Export your vault</h3>
              <div className="flex gap-3 flex-wrap">
                <a href="/api/export?format=full"
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium transition-colors">
                  ⬇ Full vault CSV
                </a>
                <a href="/api/export?format=insurance"
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium transition-colors">
                  🛡 Insurance format CSV
                </a>
              </div>
            </div>
          </div>
        ) : (
          <ImportReview rows={rows} onDone={() => { setRows(null); router.push('/vault') }} />
        )}
      </div>
    </div>
  )
}
