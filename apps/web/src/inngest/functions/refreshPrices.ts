import { inngest } from '../client'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { fetchItemPrice } from '@/lib/priceFetcher'
import { sendPriceDropAlert } from '@/lib/resend'
import type { DbVaultItem } from '@grailbabe/types'

export const refreshAllPrices = inngest.createFunction(
  { id: 'refresh-all-prices', name: 'Refresh All Vault Item Prices', concurrency: { limit: 1 } },
  { cron: '0 6 * * *' },

  async ({ step, logger }) => {
    const supabase = createServiceSupabaseClient()

    const { data: items, error } = await supabase
      .from('vault_items').select('*').order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    const allItems = (items ?? []) as DbVaultItem[]
    logger.info(`Refreshing prices for ${allItems.length} items`)

    let updated = 0, skipped = 0, failed = 0, alertsSent = 0

    const BATCH = 10
    for (let i = 0; i < allItems.length; i += BATCH) {
      const batch = allItems.slice(i, i + BATCH)

      await step.run(`batch-${i}`, async () => {
        await Promise.allSettled(batch.map(async (item) => {
          try {
            const price = await fetchItemPrice(item)
            if (!price || price.market_price == null) { skipped++; return }

            await supabase.from('price_snapshots').insert({
              vault_item_id: item.id,
              source:        price.source,
              market_price:  price.market_price,
              low_price:     price.low_price,
              high_price:    price.high_price,
              sold_price:    price.sold_price,
              currency:      price.currency,
              raw_data:      price.raw_data,
            })

            const newValue = price.market_price * item.quantity
            await supabase.from('vault_items')
              .update({ current_value_usd: newValue, value_updated_at: new Date().toISOString() })
              .eq('id', item.id)

            // ── Grail alert check ─────────────────────────────────────────────
            if (
              item.is_grail &&
              item.grail_target_price != null &&
              price.market_price <= item.grail_target_price
            ) {
              // Get user email
              const { data: user } = await supabase
                .from('users').select('email, display_name').eq('id', item.user_id).single()

              if (user?.email && user.email !== '' && !user.email.endsWith('@dev.local')) {
                try {
                  await sendPriceDropAlert({
                    userEmail:    user.email,
                    itemName:     item.name,
                    targetPrice:  item.grail_target_price,
                    currentPrice: price.market_price,
                    vaultItemId:  item.id,
                    category:     item.category,
                  })
                  alertsSent++
                } catch (emailErr) {
                  logger.warn(`Failed to send grail alert for ${item.id}`, { emailErr })
                }
              }
            }

            updated++
          } catch (e) {
            logger.warn(`Failed item ${item.id}: ${(e as Error).message}`)
            failed++
          }
        }))
      })

      if (i + BATCH < allItems.length) {
        await step.sleep('rate-limit-pause', '2s')
      }
    }

    logger.info('Done', { updated, skipped, failed, alertsSent })
    return { updated, skipped, failed, alertsSent, total: allItems.length }
  }
)

export const refreshSingleItem = inngest.createFunction(
  { id: 'refresh-single-item', name: 'Refresh Single Item Price' },
  { event: 'price/refresh.item' },

  async ({ event, step, logger }) => {
    const { vaultItemId } = event.data
    const supabase = createServiceSupabaseClient()

    const item = await step.run('fetch-item', async () => {
      const { data } = await supabase.from('vault_items').select('*').eq('id', vaultItemId).single()
      return data as DbVaultItem | null
    })

    if (!item) return { success: false }

    const price = await step.run('fetch-price', () => fetchItemPrice(item))
    if (!price || price.market_price == null) return { success: false, reason: 'no_price' }

    await step.run('save', async () => {
      await supabase.from('price_snapshots').insert({
        vault_item_id: item.id, source: price.source,
        market_price: price.market_price, low_price: price.low_price,
        high_price: price.high_price, sold_price: price.sold_price,
        currency: price.currency, raw_data: price.raw_data,
      })
      await supabase.from('vault_items')
        .update({ current_value_usd: price.market_price! * item.quantity, value_updated_at: new Date().toISOString() })
        .eq('id', item.id)
    })

    return { success: true, price: price.market_price }
  }
)
