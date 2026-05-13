'use server'

import { revalidatePath } from 'next/cache'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { getActiveClerkId } from '@/lib/auth'
import type { DbVaultItem, ItemCategory, ItemCondition, GraderType } from '@grailbabe/types'

export interface AddVaultItemInput {
  category: ItemCategory
  name: string
  cardNumber?: string
  setName?: string
  imageUrl?: string
  sourceId?: string
  condition: ItemCondition
  quantity: number
  language: string
  isGraded: boolean
  grader?: GraderType
  grade?: string
  certNumber?: string
  purchasePrice?: number
  purchaseCurrency?: string
  purchaseDate?: string
  purchasePlatform?: string
  notes?: string
  tags?: string[]
  isForTrade?: boolean
  isGrail?: boolean
  grailTargetPrice?: number
}

async function resolveSupabaseUserId(clerkId: string): Promise<string> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()
  if (data) return data.id
  const email = clerkId.startsWith('dev-') ? `${clerkId}@dev.local` : ''
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({ clerk_id: clerkId, email })
    .select('id')
    .single()
  if (error || !newUser) throw new Error(`Failed to create user: ${error?.message}`)
  return newUser.id
}

export async function getVaultItems(): Promise<DbVaultItem[]> {
  const clerkId = getActiveClerkId()
  const supabase = createServiceSupabaseClient()
  const userId = await resolveSupabaseUserId(clerkId)
  const { data, error } = await supabase
    .from('vault_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`getVaultItems: ${error.message}`)
  return (data ?? []) as DbVaultItem[]
}

export async function addVaultItem(input: AddVaultItemInput): Promise<{ success: boolean; error?: string }> {
  try {
    const clerkId = getActiveClerkId()
    const supabase = createServiceSupabaseClient()
    const userId = await resolveSupabaseUserId(clerkId)
    const { error } = await supabase.from('vault_items').insert({
      user_id: userId, category: input.category, name: input.name,
      card_number: input.cardNumber ?? null, set_name: input.setName ?? null,
      image_url: input.imageUrl ?? null, condition: input.condition,
      quantity: input.quantity, language: input.language, is_graded: input.isGraded,
      grader: input.grader ?? null, grade: input.grade ?? null,
      cert_number: input.certNumber ?? null, purchase_price: input.purchasePrice ?? null,
      purchase_currency: input.purchaseCurrency ?? 'USD',
      purchase_date: input.purchaseDate ?? null, purchase_platform: input.purchasePlatform ?? null,
      notes: input.notes ?? null, tags: input.tags ?? [],
      is_for_trade: input.isForTrade ?? false, is_grail: input.isGrail ?? false,
      grail_target_price: input.grailTargetPrice ?? null,
    })
    if (error) return { success: false, error: error.message }
    revalidatePath('/vault')
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function deleteVaultItem(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const clerkId = getActiveClerkId()
    const supabase = createServiceSupabaseClient()
    const userId = await resolveSupabaseUserId(clerkId)
    const { error } = await supabase
      .from('vault_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/vault')
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
