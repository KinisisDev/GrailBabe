import { inngest } from '../client'
import { createServiceSupabaseClient } from '@/lib/supabase'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export async function dispatchPushBatch(messages: any[]) {
  if (messages.length === 0) return []
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    })
    const { data } = await res.json()
    return data ?? []
  } catch { return [] }
}

export const sendPushOnNotification = inngest.createFunction(
  { id: 'send-push-on-notification', name: 'Send Push on Notification Created' },
  { event: 'grailbabe/notification.created' },
  async ({ event, step }) => {
    const { user_id, notification_id } = event.data as any

    const { notification, user } = await step.run('fetch-data', async () => {
      const supabase = createServiceSupabaseClient()
      const [{ data: notif }, { data: usr }] = await Promise.all([
        supabase.from('notifications').select('id,type,title,body,metadata').eq('id', notification_id).single(),
        supabase.from('users').select('id,expo_push_token,push_enabled').eq('id', user_id).single(),
      ])
      return { notification: notif, user: usr }
    })

    if (!user?.expo_push_token || !user.push_enabled || !notification) {
      return { skipped: true }
    }

    return step.run('dispatch-push', () =>
      dispatchPushBatch([{{
        to: user.expo_push_token,
        sound: 'default',
        title: notification.title ?? 'GrailBabe',
        body: notification.body ?? '',
        data: { notificationId: notification.id, type: notification.type },
      }])
    )
  }
)
