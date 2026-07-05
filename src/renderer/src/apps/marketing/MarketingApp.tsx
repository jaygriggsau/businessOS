import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '@shared/types'
import { useAsync } from '../../lib/useAsync'
import { useWindows } from '../../os/windowStore'
import { ChatIcon, SendIcon } from '../../os/icons'
import { formatMarkdown } from './markdown'

interface LocalMsg extends ChatMessage {
  streaming?: boolean
}

const SUGGESTIONS = [
  'Give me 5 low-budget ideas to get more local customers this month.',
  'Write a promo plan for a weekend sale.',
  'How do I get more Google reviews?',
  'Draft a monthly email newsletter outline for my business.'
]

let counter = 0
function newRequestId(): string {
  counter += 1
  return `req-${counter}-${Math.floor(performance.now())}`
}

export default function MarketingApp() {
  const { data: settings, reload: reloadSettings } = useAsync(() => window.api.settings.get())
  const openApp = useWindows((s) => s.openApp)

  const [messages, setMessages] = useState<LocalMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reqRef = useRef<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const hasKey = Boolean(settings?.anthropicApiKey)

  // Load persisted history once.
  useEffect(() => {
    window.api.chat.history().then((h) => setMessages(h))
  }, [])

  // Re-check the API key when the window regains focus (after saving in Settings).
  useEffect(() => {
    const onFocus = () => reloadSettings()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reloadSettings])

  // Subscribe to streaming chunks.
  useEffect(() => {
    const unsub = window.api.chat.onChunk((chunk) => {
      if (chunk.requestId !== reqRef.current) return
      setMessages((prev) => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last && last.role === 'assistant' && last.streaming) {
          copy[copy.length - 1] = { ...last, content: last.content + chunk.delta }
        }
        return copy
      })
    })
    return unsub
  }, [])

  // Auto-scroll to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || sending || !hasKey) return

    const requestId = newRequestId()
    reqRef.current = requestId
    setInput('')
    setError(null)
    setSending(true)

    // Optimistic user message + streaming assistant placeholder.
    const now = new Date().toISOString()
    setMessages((prev) => [
      ...prev,
      { id: -Date.now(), role: 'user', content, createdAt: now },
      { id: -Date.now() - 1, role: 'assistant', content: '', createdAt: now, streaming: true }
    ])

    try {
      await window.api.chat.send(requestId, content)
      // Replace optimistic state with the authoritative persisted history.
      const history = await window.api.chat.history()
      setMessages(history)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The assistant could not reply.')
      // Drop the empty streaming placeholder on error.
      setMessages((prev) => prev.filter((m) => !m.streaming))
    } finally {
      reqRef.current = null
      setSending(false)
    }
  }

  const clearChat = async () => {
    if (messages.length > 0 && !confirm('Clear this conversation?')) return
    await window.api.chat.clear()
    setMessages([])
    setError(null)
  }

  return (
    <div className="flex h-full flex-col bg-slate-950/60">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white">
          <ChatIcon width={18} height={18} />
        </span>
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-white">Marketing Assistant</h1>
          <p className="text-[11px] text-slate-400">
            {settings?.businessName
              ? `Advising ${settings.businessName}`
              : 'Custom marketing advice for your business'}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-2xl">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 pt-8 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white">
                <ChatIcon width={28} height={28} />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Your on-demand marketing consultant
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Ask anything about promoting your business. Try one of these:
                </p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={!hasKey}
                    className="rounded-xl border border-white/5 bg-slate-900/60 p-3 text-left text-xs text-slate-300 transition hover:border-white/15 hover:bg-slate-800/60 disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
          </div>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Error / no-key notice */}
      {error && (
        <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
      {!hasKey && (
        <div className="border-t border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          Add your Anthropic API key to start chatting.{' '}
          <button
            className="font-medium underline"
            onClick={() => openApp('settings', { title: 'Settings', singleton: true })}
          >
            Open Settings →
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-white/5 p-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            rows={1}
            placeholder={hasKey ? 'Ask for marketing advice…' : 'Add your API key in Settings first'}
            disabled={!hasKey}
            className="selectable max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500 placeholder:text-slate-500 disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || sending || !hasKey}
            className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-500 disabled:opacity-40"
            title="Send"
          >
            <SendIcon width={18} height={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Bubble({ message }: { message: LocalMsg }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand-600 px-3.5 py-2 text-sm text-white selectable">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="flex max-w-[90%] gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white">
          <ChatIcon width={15} height={15} />
        </span>
        <div className="min-w-0 rounded-2xl rounded-tl-sm bg-slate-800/70 px-3.5 py-2.5">
          {message.content ? (
            <div
              className="chat-md selectable text-sm text-slate-100"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
            />
          ) : (
            <span className="inline-flex gap-1 py-1">
              <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Dot({ delay = '0ms' }: { delay?: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
      style={{ animationDelay: delay }}
    />
  )
}
