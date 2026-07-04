import type { SampleFetchResult } from '@shared/types'

/**
 * Best-effort extraction of a Facebook post's text from its public URL.
 *
 * Facebook aggressively blocks automated fetching (login walls, bot
 * detection, JS-rendered content), so this frequently returns little or
 * nothing. The UI always keeps the sample text editable so the owner can
 * paste it manually — this is a convenience, not a guarantee.
 */
export async function fetchFacebookSample(url: string): Promise<SampleFetchResult> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, text: '', note: 'That doesn’t look like a valid URL.' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, text: '', note: 'Only http(s) links are supported.' }
  }

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        // A desktop browser UA gives us the best chance at the public HTML.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })

    if (!res.ok) {
      return {
        ok: false,
        text: '',
        note: `Facebook returned ${res.status}. Paste the sample post text below instead.`
      }
    }

    const html = await res.text()
    const text = extractPostText(html)

    if (!text) {
      return {
        ok: false,
        text: '',
        note: 'Couldn’t read the post text (Facebook likely blocked it). Paste it below instead.'
      }
    }

    return {
      ok: true,
      text,
      note: 'Pulled a sample from the link. Edit it if it looks off.'
    }
  } catch (err) {
    return {
      ok: false,
      text: '',
      note:
        'Couldn’t reach that link (' +
        (err instanceof Error ? err.message : 'network error') +
        '). Paste the sample text below instead.'
    }
  }
}

/** Pull the most post-like text out of Open Graph / meta tags. */
function extractPostText(html: string): string {
  const candidates = [
    metaContent(html, 'property', 'og:description'),
    metaContent(html, 'name', 'description'),
    metaContent(html, 'property', 'og:title')
  ].filter((c): c is string => Boolean(c && c.trim()))

  if (candidates.length === 0) return ''
  // Prefer the longest candidate — it's most likely the actual post body.
  const best = candidates.sort((a, b) => b.length - a.length)[0]
  return decodeEntities(best).trim()
}

function metaContent(html: string, attr: string, value: string): string | null {
  // Match <meta ... attr="value" ... content="..."> in either attribute order.
  const patterns = [
    new RegExp(
      `<meta[^>]*${attr}=["']${escapeRegex(value)}["'][^>]*content=["']([^"']*)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${escapeRegex(value)}["']`,
      'i'
    )
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m && m[1]) return m[1]
  }
  return null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
}
