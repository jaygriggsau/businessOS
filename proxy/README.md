# businessOS AI proxy

Lets many copies of the businessOS app share **one** Anthropic key without ever
shipping that key inside the app.

```
businessOS app  ──►  this proxy (holds your key)  ──►  api.anthropic.com
```

The app sends an **access code** (not the real key). The proxy validates the
code, rate-limits it, swaps in your real Anthropic key, and forwards the
request. The key lives only in a server environment variable — never in the
app, the repo, or a client.

## Why not just put the key in the app?

A distributed `.exe` and a public repo are both trivially readable — a bundled
key is a *public* key. Anyone could extract it and spend your credits with no
limit. This proxy is the safe way to run "everyone on my key."

## Before you deploy — two must-dos

1. **Rotate your key.** Create a *fresh* key at
   <https://console.anthropic.com/settings/keys>. Never reuse a key you've
   pasted into a chat, commit, or screenshot.
2. **Set a spend limit.** In the Anthropic console set a monthly usage cap so a
   mistake or abuse can't run away. The proxy's rate limits are a second layer,
   not a billing guarantee.

## Configuration (environment variables)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | ✅ | — | Your (fresh) Anthropic key. Server-side only. |
| `ACCESS_CODES` | ✅* | — | Comma-separated codes the app must send. One per customer/device so you can revoke individually. |
| `RATE_LIMIT_PER_MIN` | | `20` | Requests/minute per access code. |
| `DAILY_LIMIT` | | `0` | Max requests/day per code (`0` = unlimited). |
| `PORT` | | `8787` | Listen port (most hosts set this for you). |
| `ALLOW_OPEN` | | `false` | `true` runs with no auth — anyone can spend your credits. Discouraged. |

\* Either set `ACCESS_CODES` or explicitly set `ALLOW_OPEN=true`, or the server
refuses to start.

## Run locally

```bash
cd proxy
cp .env.example .env      # fill in a FRESH key + your access codes
node --env-file=.env server.js
# → businessOS proxy listening on :8787
```

## Deploy (pick one)

**Render (simple, free tier):**
1. Push this repo to GitHub (already done).
2. Render → New → **Web Service** → point at this repo, root directory `proxy`.
3. Build command: *(none)* · Start command: `node server.js`.
4. Add environment variables: `ANTHROPIC_API_KEY`, `ACCESS_CODES` (mark the key
   as secret). Deploy. Your URL is like `https://businessos-proxy.onrender.com`.

**Docker (Fly.io, Railway, a VPS):**
```bash
docker build -t businessos-proxy ./proxy
docker run -p 8787:8787 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e ACCESS_CODES=code-one,code-two \
  businessos-proxy
```

## Point the app at it

In businessOS → **Settings → Business & AI**:
- **Proxy URL**: your deployed URL (e.g. `https://businessos-proxy.onrender.com`)
- **Access code**: one of the codes from `ACCESS_CODES`

Leave those blank to fall back to a personal Anthropic key instead. When a proxy
URL is set, the app ignores the local key and routes through the proxy.

## Health check

`GET /` or `GET /healthz` → `{ "ok": true, "service": "businessos-proxy" }`
