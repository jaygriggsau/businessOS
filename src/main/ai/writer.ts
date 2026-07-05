import Anthropic from '@anthropic-ai/sdk'
import type { WriterAction, WriterRequest } from '@shared/types'
import { getSettings } from '../db/settings'

const INSTRUCTIONS: Record<WriterAction, string> = {
  improve: 'Rewrite the text to be clearer, more engaging, and better structured, keeping the original meaning and roughly the same length.',
  grammar: 'Fix all spelling, grammar, and punctuation mistakes. Make no other changes — keep the wording and style otherwise identical.',
  shorten: 'Make the text significantly more concise while keeping every key point. Cut filler and redundancy.',
  lengthen: 'Expand the text with more detail, examples, and explanation, keeping the same tone and intent.',
  professional: 'Rewrite the text in a polished, professional business tone.',
  friendly: 'Rewrite the text in a warm, friendly, approachable tone.',
  continue: 'Continue writing naturally from where the text leaves off. Return ONLY the new continuation text (do not repeat the text you were given).',
  summarize: 'Summarize the text into a short, clear summary of its key points.'
}

// Structured output guarantees we get back only the transformed text.
const SCHEMA = {
  type: 'object',
  properties: { result: { type: 'string', description: 'The transformed text.' } },
  required: ['result'],
  additionalProperties: false
} as const

export async function enhanceText(request: WriterRequest): Promise<string> {
  const key = getSettings().anthropicApiKey.trim()
  if (!key) {
    throw new Error(
      'No Anthropic API key set. Open Settings and paste your key to use AI enhancements.'
    )
  }
  const text = request.text.trim()
  if (!text) throw new Error('There’s no text to work with. Select some text or type something first.')

  const client = new Anthropic({ apiKey: key })

  const directive = request.instruction?.trim()
    ? `Apply this instruction to the text: ${request.instruction.trim()}`
    : INSTRUCTIONS[request.action]

  const system =
    'You are an expert writing assistant embedded in a document editor. ' +
    'You transform the user’s text as instructed and return only the result — ' +
    'no preamble, quotes, or commentary. Preserve the original language.'

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4000,
    system,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [
      {
        role: 'user',
        content: `${directive}\n\nText:\n"""\n${text}\n"""`
      }
    ]
  })

  const block = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text'
  )
  if (!block) throw new Error('The model returned nothing. Please try again.')

  try {
    const parsed = JSON.parse(block.text) as { result: string }
    return parsed.result ?? ''
  } catch {
    // Fall back to the raw text if structured parsing somehow fails.
    return block.text
  }
}
