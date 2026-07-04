'use strict'

/**
 * businessOS AI proxy
 * ---------------------
 * A tiny reverse proxy that lets many copies of the businessOS app share ONE
 * Anthropic key without ever shipping that key inside the app.
 *
 *   businessOS app  ──►  this proxy (holds the key)  ──►  api.anthropic.com
 *
 * The app points its Anthropic client's baseURL at this server and sends an
 * ACCESS CODE (not the real key) as x-api-key. The proxy:
 *   1. validates the access code,
 *   2. rate-limits per code (per-minute + optional per-day cap),
 *   3. swaps in the real Anthropic key and forwards the request.
 *
 * The real key is read from the ANTHROPIC_API_KEY environment variable and is
 * NEVER written to disk or returned to clients.
 */

const http = require('node:http')
const { Readable } = require('node:stream')

const UPSTREAM = 'https://api.anthropic.com'

// ---- Configuration (all via environment variables) ----
const API_KEY = (process.env.ANTHROPIC_API_KEY || '').trim()
const ACCESS_CODES = (process.env.ACCESS_CODES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const ALLOW_OPEN = process.env.ALLOW_OPEN === 'true'
const RATE_PER_MIN = Number.parseInt(process.env.RATE_LIMIT_PER_MIN || '20', 10)
const DAILY_LIMIT = Number.parseInt(process.env.DAILY_LIMIT || '0', 10) // 0 = unlimited
const PORT = Number.parseInt(process.env.PORT || '8787', 10)

if (!API_KEY) {
  console.error('FATAL: ANTHROPIC_API_KEY is not set. Refusing to start.')
  process.exit(1)
}
if (ACCESS_CODES.length === 0 && !ALLOW_OPEN) {
  console.error(
    'FATAL: No ACCESS_CODES set and ALLOW_OPEN is not "true". This would be an ' +
      'open proxy that anyone could use to spend your credits. Set ACCESS_CODES ' +
      '(comma-separated) or, only if you really mean it, ALLOW_OPEN=true.'
  )
  process.exit(1)
}

// ---- In-memory rate limiting (per access code) ----
/** @type {Map<string, { minute: number[]; day: { count: number; resetAt: number } }>} */
const buckets = new Map()

function checkRateLimit(code) {
  const now = Date.now()
  let b = buckets.get(code)
  if (!b) {
    b = { minute: [], day: { count: 0, resetAt: startOfNextDay(now) } }
    buckets.set(code, b)
  }

  // Sliding one-minute window.
  b.minute = b.minute.filter((t) => now - t < 60_000)
  if (b.minute.length >= RATE_PER_MIN) {
    return { ok: false, reason: 'Too many requests this minute. Slow down and try again shortly.' }
  }

  // Daily cap.
  if (now >= b.day.resetAt) {
    b.day = { count: 0, resetAt: startOfNextDay(now) }
  }
  if (DAILY_LIMIT > 0 && b.day.count >= DAILY_LIMIT) {
    return { ok: false, reason: 'Daily generation limit reached. Try again tomorrow.' }
  }

  b.minute.push(now)
  b.day.count += 1
  return { ok: true }
}

function startOfNextDay(now) {
  const d = new Date(now)
  d.setUTCHours(24, 0, 0, 0)
  return d.getTime()
}

function validCode(code) {
  if (ALLOW_OPEN && ACCESS_CODES.length === 0) return true
  return code.length > 0 && ACCESS_CODES.includes(code)
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*'
  })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  // CORS preflight (harmless for the Electron client, useful for testing).
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, GET, OPTIONS',
      'access-control-allow-headers': 'content-type, x-api-key, anthropic-version, anthropic-beta'
    })
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`)

  // Health check.
  if (url.pathname === '/' || url.pathname === '/healthz') {
    return sendJson(res, 200, { ok: true, service: 'businessos-proxy' })
  }

  // Only proxy the Anthropic API surface.
  if (!url.pathname.startsWith('/v1/')) {
    return sendJson(res, 404, { error: { type: 'not_found', message: 'Unknown path.' } })
  }

  // The app sends its ACCESS CODE in x-api-key (never the real key).
  const accessCode = String(req.headers['x-api-key'] || '')
  if (!validCode(accessCode)) {
    return sendJson(res, 401, {
      error: { type: 'authentication_error', message: 'Invalid or missing access code.' }
    })
  }

  const limit = checkRateLimit(accessCode)
  if (!limit.ok) {
    res.setHeader('retry-after', '30')
    return sendJson(res, 429, { error: { type: 'rate_limit_error', message: limit.reason } })
  }

  // Buffer the request body.
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = Buffer.concat(chunks)

  // Forward upstream with the REAL key swapped in.
  const headers = {
    'content-type': req.headers['content-type'] || 'application/json',
    'x-api-key': API_KEY,
    'anthropic-version': req.headers['anthropic-version'] || '2023-06-01'
  }
  if (req.headers['anthropic-beta']) headers['anthropic-beta'] = req.headers['anthropic-beta']

  try {
    const upstream = await fetch(UPSTREAM + url.pathname + url.search, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body
    })

    res.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') || 'application/json',
      'access-control-allow-origin': '*'
    })
    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(res)
    } else {
      res.end()
    }
  } catch (err) {
    sendJson(res, 502, {
      error: {
        type: 'api_error',
        message: 'Upstream request failed: ' + (err instanceof Error ? err.message : 'unknown')
      }
    })
  }
})

server.listen(PORT, () => {
  console.log(`businessOS proxy listening on :${PORT}`)
  console.log(
    `access codes: ${ACCESS_CODES.length || (ALLOW_OPEN ? 'OPEN (no auth!)' : 0)} · ` +
      `rate: ${RATE_PER_MIN}/min · daily cap: ${DAILY_LIMIT || 'none'}`
  )
})
