import type { Metadata } from 'next'
import { ChaseView } from '@/components/chase/ChaseView'

export const metadata: Metadata = { title: 'The Chase' }

export default function ChasePage() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">The Chase 🎯</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Track set completion and find out what it would cost to finish the hunt.
          </p>
        </div>
        <ChaseView />
      </div>
    </div>
  )
}
