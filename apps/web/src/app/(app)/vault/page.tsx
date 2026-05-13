import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getVaultItems } from '@/app/actions/vault'
import { VaultGrid } from '@/components/vault/VaultGrid'

export const metadata: Metadata = { title: 'Vault' }

export default async function VaultPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const items = await getVaultItems()

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-screen-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">My Vault</h1>
          <p className="text-neutral-500 text-sm mt-1">
            {items.length > 0
              ? `${items.length} item${items.length !== 1 ? 's' : ''} in your collection`
              : 'Your collection, organized.'}
          </p>
        </div>

        <VaultGrid items={items} />
      </div>
    </div>
  )
}
