import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id:   'grailbabe',
  name: 'GrailBabe',
})

export type Events = {
  'price/refresh.item': {
    data: { vaultItemId: string; userId: string }
  }
  'price/refresh.all': {
    data: Record<string, never>
  }
  'digest/send.user': {
    data: { userId: string }
  }
}
