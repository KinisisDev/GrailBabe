import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'GrailBabe <alerts@grailbabe.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://grailbabe.com'

export interface PriceAlertData {
  userEmail: string; itemName: string; targetPrice: number; currentPrice: number; vaultItemId: string; category: string
}

export async function sendPriceDropAlert(data: PriceAlertData) {
  const diff = data.targetPrice - data.currentPrice
  Return resend.emails.send({
    from: FROM, to: data.userEmail,
    subject: `✨ Grail alert: ${data.itemName} is below your target`,
    html: `<p>${data.itemName} is now $${data.currentPrice.toFixed(2)} (Target: $${data.targetPrice.toFixed(2)})</p><a href="${APP_URL}/vault">View in Vault</a>`,
  })
}

export interface DigestData {
  userEmail: string; displayName: string; insights: string[]; totalValue: number; weeklyChange: number
  topGainer: { name: string; pct: number } | null
}

export async function sendWeeklyDigest(data: DigestData) {
  return resend.emails.send({
    from: FROM, to: data.userEmail,
    subject: `📊 Your weekly GrailBabe digest`,
    html: `<h3>Hi ${data.displayName}!</h3><p>Portfolio value: $${data.totalValue.toFixed(2)}</p>${data.insights.map(i => `<p>${i}</p>`).join('')}`,
  })
}
