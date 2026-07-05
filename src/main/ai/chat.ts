import Anthropic from '@anthropic-ai/sdk'
import type { ChatMessage } from '@shared/types'
import { getSettings } from '../db/settings'

/**
 * Stream a marketing-advice reply from Claude, calling onDelta with each text
 * chunk as it arrives. Returns the complete reply text.
 */
export async function generateChatReply(
  history: ChatMessage[],
  onDelta: (delta: string) => void
): Promise<string> {
  const settings = getSettings()
  const key = settings.anthropicApiKey.trim()
  if (!key) {
    throw new Error(
      'No Anthropic API key set. Open Settings and paste your key to chat with the assistant.'
    )
  }

  const client = new Anthropic({ apiKey: key })

  const businessBits = [
    settings.businessName && `Business name: ${settings.businessName}`,
    settings.businessIndustry && `Industry: ${settings.businessIndustry}`
  ]
    .filter(Boolean)
    .join('\n')

  const system =
    'You are a sharp, experienced marketing consultant for local and small ' +
    'businesses. Give specific, practical, budget-conscious advice — concrete ' +
    'tactics, examples, templates, and step-by-step actions, never generic ' +
    'filler. Ask a clarifying question when it would materially improve your ' +
    'advice, but otherwise be decisive. Keep replies focused and skimmable: ' +
    'short paragraphs, bullet points, and bold key ideas where it helps.' +
    (businessBits ? `\n\nThe business you are advising:\n${businessBits}` : '')

  // The Messages API is stateless — send the full conversation each turn.
  const messages = history.map((m) => ({ role: m.role, content: m.content }))

  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 2000,
    system,
    messages
  })

  stream.on('text', (delta) => onDelta(delta))

  const final = await stream.finalMessage()
  return final.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
}
