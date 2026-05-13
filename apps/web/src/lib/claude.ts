import Anthropic from '@anthropic-ai/sdk'

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY is not set — AI features will fail.')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const CLAUDE_MODEL = 'claude-sonnet-4-6'

/**
 * Quick text completion — returns a plain string.
 * For JSON responses, use claudeJSON() instead.
 */
export async function claudeText(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1024
): Promise<string> {
  const msg = await anthropic.messages.create({
    model:      CLAUDE_MODEL,
    max_tokens: maxTokens,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userMessage }],
  })
  const block = msg.content[0]
  return block.type === 'text' ? block.text : ''
}

/**
 * JSON-mode completion — parses Claude's response as JSON.
 * Pass T to type the result. Throws if parsing fails.
 */
export async function claudeJSON<T = unknown>(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2048
): Promise<T> {
  const system = `${systemPrompt}\n\nYou MUST respond with valid JSON only — no markdown, no explanation, no code fences.`
  const text = await claudeText(system, userMessage, maxTokens)

  // Strip any accidental markdown fences
  const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    return JSON.parse(cleaned) as T
  } catch {
    throw new Error(`Claude returned invalid JSON: ${cleaned.slice(0, 200)}`)
  }
}
