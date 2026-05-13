import { inngest } from '../client'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { claudeJSON } from '@/lib/claude'
import { sendWeeklyDigest } from '@/lib/resend'

interface WeeklyInsights {
  insights:     string[]   // 3-5 bullet points
  summary:      string
}

const SYSTEM = `You are a collectibles portfolio analyst writing a brief weekly digest for a GrailBabe collector.
Be specific, conversational, and data-driven. Do NOT use generic platitudes.

The digest should cover:
1. A one-sentence portfolio performance summary for the week
2. Notable price movements (specific cards/items, not vague)
3. A market observation or trend relevant to their collection
4. One concrete, actionable recommendation

Write exactly 4 items in the insights array. Each should be one to two sentences, specific, and useful.
Return JSON: { insights: string[], summary: string }`

export const weeklyDigest = inngest.createFunction(
  { id: 'weekly-digest', name: 'Weekly AI Portfolio Digest' },
  { cron: '0 8 * * 1' }, // Monday 08:00 UTC

  async ({ step, logger }) => {
    const supabase = createServiceSupabaseClient()

    // Get all users with email addresses
    const { data: users } = await supabase
      .from('users')
      .select('id, email, display_name, portfolio_value_usd')
      .not('email', 'is', null)
      .neq('email', '')

    if (!users?.length) return { sent: 0 }

    let sent = 0

    for (const user of users) {
      // Skip dev placeholder emails
      if (user.email.endsWith('@dev.local')) continue

      await step.run(`digest-${user.id}`, async () => {
        // Gather portfolio data for this user
        const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

        const { data: items } = await supabase
          .from('vault_items')
          .select('name, category, current_value_usd, purchase_price, is_grail')
          .eq('user_id', user.id)

        if (!items?.length) return // skip empty vaults

        const { data: recentSnapshots } = await supabase
          .from('price_snapshots')
          .select('vault_item_id, market_price, fetched_at')
          .gte('fetched_at', since7d)
          .in('vault_item_id', items.map((_, i) => i)) // join needed — simplified for now

        const totalValue = items.reduce((s, i) => s + (i.current_value_usd ?? 0), 0)
        const totalCost  = items.reduce((s, i) => s + (i.purchase_price  ?? 0), 0)
        const weeklyChange = totalValue - (user.portfolio_value_usd ?? totalValue)

        // Build prompt data
        const topItems = [...items]
          .sort((a, b) => (b.current_value_usd ?? 0) - (a.current_value_usd ?? 0))
          .slice(0, 10)
          .map((i) => `${i.name}: $${i.current_value_usd ?? '?'} (cost: $${i.purchase_price ?? '?'})`)
          .join('\n')

        const portfolioSummary = `
User: ${user.display_name ?? user.email}
Total items: ${items.length}
Portfolio value: $${totalValue.toFixed(2)}
Cost basis: $${totalCost.toFixed(2)}
Unrealized gain: $${(totalValue - totalCost).toFixed(2)}
Weekly change: $${weeklyChange.toFixed(2)}
Grail items: ${items.filter((i) => i.is_grail).length}

Top items by value:
${topItems}`

        let insights: WeeklyInsights
        try {
          insights = await claudeJSON<WeeklyInsights>(SYSTEM, portfolioSummary, 800)
        } catch (e) {
          logger.warn(`Claude failed for user ${user.id}: ${(e as Error).message}`)
          return
        }

        try {
          await sendWeeklyDigest({
            userEmail:    user.email,
            displayName:  user.display_name ?? 'Collector',
            insights:     insights.insights,
            totalValue,
            weeklyChange,
            topGainer:    null, // could be enhanced
          })
          // Update stored portfolio value for delta calculation next week
          await supabase
            .from('users')
            .update({ portfolio_value_usd: totalValue })
            .eq('id', user.id)
          sent++
        } catch (emailErr) {
          logger.warn(`Digest email failed for ${user.id}`, { emailErr })
        }
      })
    }

    logger.info(`Weekly digest sent to ${sent} users`)
    return { sent }
  }
)
