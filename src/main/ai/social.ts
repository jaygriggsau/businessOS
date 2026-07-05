import Anthropic from '@anthropic-ai/sdk'
import type { SocialInput, SocialResult } from '@shared/types'
import { getSettings } from '../db/settings'

const PLATFORM_GUIDANCE: Record<SocialInput['platform'], string> = {
  facebook: 'Facebook: conversational, 1–3 short paragraphs, a light call to action. 3–6 hashtags.',
  instagram:
    'Instagram: punchy and visual, a hook in the first line, line breaks, an emoji or two if it fits. 8–15 hashtags.',
  linkedin:
    'LinkedIn: professional and value-led, no fluff, a clear takeaway. 3–5 hashtags.',
  x: 'X/Twitter: a single tight post under 280 characters. 1–3 hashtags.'
}

// Structured-output schema: forces Claude to return exactly these fields.
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    post: { type: 'string', description: 'The ready-to-publish post text.' },
    hashtags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Relevant hashtags, each including the leading # symbol.'
    },
    imagePrompt: {
      type: 'string',
      description:
        'A vivid, concrete prompt for an image generator to create an on-brand photo/graphic for this post. No text in the image.'
    }
  },
  required: ['post', 'hashtags', 'imagePrompt'],
  additionalProperties: false
} as const

interface GeneratedCopy {
  post: string
  hashtags: string[]
  imagePrompt: string
}

function getClient(): Anthropic {
  const key = getSettings().anthropicApiKey.trim()
  if (!key) {
    throw new Error(
      'No Anthropic API key set. Open Settings and paste your key to enable post generation.'
    )
  }
  return new Anthropic({ apiKey: key })
}

export async function generateSocialPost(input: SocialInput): Promise<SocialResult> {
  const settings = getSettings()
  const client = getClient()

  const businessBits = [
    settings.businessName && `Business name: ${settings.businessName}`,
    settings.businessIndustry && `Industry: ${settings.businessIndustry}`
  ]
    .filter(Boolean)
    .join('\n')

  const toneBlock = input.sampleText.trim()
    ? `Here is a sample post whose TONE and VOICE you should closely match (mirror its style, rhythm, formality, and use of emoji — but write about the new topic, do not copy its content):\n"""\n${input.sampleText.trim()}\n"""`
    : 'No sample post was provided — use a warm, authentic small-business voice.'

  const system =
    'You are a social media copywriter for local, independent businesses. ' +
    'You write posts that sound human and on-brand — never generic or "salesy". ' +
    'Match the requested platform conventions and the sample tone precisely.'

  const userPrompt = [
    businessBits,
    '',
    `Platform — ${PLATFORM_GUIDANCE[input.platform]}`,
    '',
    `Write a social media post about: ${input.topic}`,
    '',
    toneBlock,
    '',
    'Return the post text, a set of hashtags, and an image prompt for an accompanying visual.'
  ]
    .filter((l) => l !== undefined)
    .join('\n')

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1500,
    system,
    output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    messages: [{ role: 'user', content: userPrompt }]
  })

  const copy = parseCopy(response)

  let imageDataUrl: string | null = null
  let imageError: string | undefined
  if (input.includeImage) {
    try {
      imageDataUrl = await generateImage(copy.imagePrompt)
    } catch (err) {
      imageError = err instanceof Error ? err.message : 'Image generation failed.'
    }
  }

  return {
    post: copy.post,
    hashtags: normalizeHashtags(copy.hashtags),
    imagePrompt: copy.imagePrompt,
    imageDataUrl,
    imageError
  }
}

function parseCopy(response: Anthropic.Message): GeneratedCopy {
  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text'
  )
  if (!textBlock) throw new Error('The model returned no text to parse.')

  let data: GeneratedCopy
  try {
    data = JSON.parse(textBlock.text) as GeneratedCopy
  } catch {
    throw new Error('Could not parse the generated post. Please try again.')
  }
  if (!data.post) throw new Error('The generated post was empty. Please try again.')
  return {
    post: data.post,
    hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
    imagePrompt: data.imagePrompt ?? ''
  }
}

function normalizeHashtags(tags: string[]): string[] {
  return tags
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`))
    .map((t) => t.replace(/\s+/g, ''))
}

/**
 * Generate an image with a keyless service (Pollinations). Runs in the main
 * process so there are no CORS/CSP constraints; the bytes are returned to the
 * renderer as a data URL.
 */
async function generateImage(prompt: string): Promise<string> {
  const encoded = encodeURIComponent(prompt.slice(0, 800))
  const url =
    `https://image.pollinations.ai/prompt/${encoded}` +
    '?width=1024&height=1024&nologo=true&model=flux'

  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`Image service returned ${res.status}.`)

  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  if (!contentType.startsWith('image/')) {
    throw new Error('Image service did not return an image.')
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  return `data:${contentType};base64,${buffer.toString('base64')}`
}
