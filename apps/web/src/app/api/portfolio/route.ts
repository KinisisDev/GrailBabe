import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase'

function emptyPortfolio() {
  return { totalValue: 0, totalCost: 0, totalGain: 0, gainPct: 0, itemCount: 0, grailCount: 0, categoryBreakdown: [], topGainers: [], topLosers: [] }
}

export async function GET(req: NextRequest) {
  const clerkId = req.nextUrl.searchParams.get('clerk_id')
  if (!clerkId) return NextResponse.json({ error: 'clerk_id required' }, { status: 400 })

  try {
    const supabase = createServiceSupabaseClient()
    const { data: user } = await supabase.from('users').select('id').eq('clerk_id', clerkId).single()
    if (!user) return NextResponse.json(emptyPortfolio())

    const { data: items } = await supabase.from('vault_items')
      .select('id,name,category,quantity,purchase_price,current_value_usd,image_url,is_grail')
      .eq('user_id', user.id)

    if (!items || items.length === 0) return NextResponse.json(emptyPortfolio())

    let totalValue = 0, totalCost = 0, grailCount = 0
    const catMap: Record<string, { count: number; value: number }> = {}

    for (const item of items) {
      const qty = item.quantity ?? 1
      const val = (item.current_value_usd ?? 0) * qty
      totalValue += val; totalCost += (item.purchase_price ?? 0) * qty
      if (item.is_grail) grailCount++
      const cat = item.category ?? 'other'
      if (!catMap[cat]) catMap[cat] = { count: 0, value: 0 }
      catMap[cat].count += qty; catMap[cat].value += val
    }

    const categoryBreakdown = Object.entries(catMap).map(([cat, { count, value }]) => ({
      category: cat, count, totalValue: value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
    }))

    return NextResponse.json({
      totalValue, totalCost, totalGain: totalValue - totalCost,
      gainPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      itemCount: items.length, grailCount, categoryBreakdown,
      topGainers: [], topLosers: []
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
