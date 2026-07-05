import { useEffect, useState } from 'react'
import type { SampleFetchResult, SocialPlatform, SocialResult } from '@shared/types'
import { useAsync } from '../../lib/useAsync'
import { Button, Field, Input, Select, Textarea } from '../../lib/ui'
import { useWindows } from '../../os/windowStore'
import {
  CopyIcon,
  DownloadIcon,
  SearchIcon,
  SocialIcon,
  SparkleIcon
} from '../../os/icons'

const PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X / Twitter' }
]

export default function SocialApp() {
  const { data: settings, reload } = useAsync(() => window.api.settings.get())
  const openApp = useWindows((s) => s.openApp)

  const [sampleUrl, setSampleUrl] = useState('')
  const [sampleText, setSampleText] = useState('')
  const [sampleNote, setSampleNote] = useState('')
  const [fetching, setFetching] = useState(false)

  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState<SocialPlatform>('facebook')
  const [includeImage, setIncludeImage] = useState(true)

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SocialResult | null>(null)

  // Re-check the key whenever the window regains focus (e.g. after saving it in Settings).
  useEffect(() => {
    const onFocus = () => reload()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])

  const hasKey = Boolean(settings?.anthropicApiKey)

  const fetchSample = async () => {
    if (!sampleUrl.trim()) return
    setFetching(true)
    setSampleNote('')
    try {
      const res: SampleFetchResult = await window.api.social.fetchSample(sampleUrl.trim())
      if (res.ok && res.text) setSampleText(res.text)
      setSampleNote(res.note)
    } finally {
      setFetching(false)
    }
  }

  const generate = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const res = await window.api.social.generate({
        topic: topic.trim(),
        sampleText,
        sampleUrl,
        platform,
        includeImage
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Inputs */}
      <aside className="flex w-[360px] shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-slate-900/40 p-4">
        <h1 className="mb-1 text-lg font-semibold text-white">Social Studio</h1>
        <p className="mb-4 text-xs text-slate-400">
          Match the tone of a post you like, then generate a caption, hashtags and an image.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <Field label="Sample post URL (Facebook, optional)">
              <div className="flex gap-2">
                <Input
                  value={sampleUrl}
                  onChange={(e) => setSampleUrl(e.target.value)}
                  placeholder="https://facebook.com/…/posts/…"
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={fetchSample}
                  disabled={fetching || !sampleUrl.trim()}
                  title="Try to read the post"
                >
                  <SearchIcon width={15} height={15} />
                </Button>
              </div>
            </Field>
            {sampleNote && <p className="mt-1 text-[11px] text-slate-500">{sampleNote}</p>}
          </div>

          <Field label="Sample post text (tone to copy)">
            <Textarea
              rows={5}
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="Paste a post whose writing style you want to match — or leave blank."
            />
          </Field>

          <Field label="What do you want to post about? *">
            <Textarea
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Weekend sale — 20% off all coffee beans, Saturday only"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Platform">
              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex cursor-pointer flex-col gap-1">
              <span className="text-xs font-medium text-slate-400">Image</span>
              <button
                type="button"
                onClick={() => setIncludeImage((v) => !v)}
                className={`flex h-[38px] items-center justify-between rounded-lg border px-3 text-sm transition ${
                  includeImage
                    ? 'border-brand-500/50 bg-brand-600/20 text-slate-100'
                    : 'border-white/10 bg-slate-800/60 text-slate-400'
                }`}
              >
                {includeImage ? 'Generate' : 'Skip'}
                <span
                  className={`ml-2 h-4 w-4 rounded-full ${
                    includeImage ? 'bg-brand-400' : 'bg-slate-600'
                  }`}
                />
              </button>
            </label>
          </div>

          <Button
            variant="primary"
            className="mt-1 h-10"
            onClick={generate}
            disabled={generating || !topic.trim() || !hasKey}
          >
            <SparkleIcon width={17} height={17} />
            {generating ? 'Generating…' : 'Generate post'}
          </Button>

          {!hasKey && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              Add your Anthropic API key to start generating.
              <button
                className="mt-2 block font-medium text-amber-100 underline"
                onClick={() => openApp('settings', { title: 'Settings', singleton: true })}
              >
                Open Settings →
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Results */}
      <section className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {!result && !generating && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-500">
            <SocialIcon width={44} height={44} />
            <div>
              <p className="text-sm font-medium text-slate-300">Your post will appear here</p>
              <p className="mt-1 text-xs text-slate-500">
                Describe what you want to post and hit Generate.
              </p>
            </div>
          </div>
        )}

        {generating && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <SparkleIcon width={36} height={36} className="animate-pulse" />
            <p className="text-sm">Writing your post{includeImage ? ' and creating an image' : ''}…</p>
          </div>
        )}

        {result && !generating && <Results result={result} platform={platform} />}
      </section>
    </div>
  )
}

function Results({ result, platform }: { result: SocialResult; platform: SocialPlatform }) {
  const hashtagLine = result.hashtags.join(' ')
  const fullText = hashtagLine ? `${result.post}\n\n${hashtagLine}` : result.post

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card
        title="Post"
        copyText={result.post}
        footer={<CopyButton text={fullText} label="Copy post + hashtags" />}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100 selectable">
          {result.post}
        </p>
      </Card>

      {result.hashtags.length > 0 && (
        <Card title="Hashtags" copyText={hashtagLine}>
          <div className="flex flex-wrap gap-1.5">
            {result.hashtags.map((h) => (
              <span
                key={h}
                className="rounded-full bg-pink-500/15 px-2 py-0.5 text-xs font-medium text-pink-300 selectable"
              >
                {h}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card title="Image">
        {result.imageDataUrl ? (
          <div className="space-y-3">
            <img
              src={result.imageDataUrl}
              alt="Generated visual for the post"
              className="w-full rounded-lg border border-white/10"
            />
            <a
              href={result.imageDataUrl}
              download={`businessos-${platform}-image.jpg`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700/70 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
            >
              <DownloadIcon width={15} height={15} /> Download image
            </a>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {result.imageError ?? 'No image was generated for this post.'}
          </p>
        )}
        {result.imagePrompt && (
          <p className="mt-3 border-t border-white/5 pt-2 text-[11px] text-slate-500 selectable">
            Prompt: {result.imagePrompt}
          </p>
        )}
      </Card>
    </div>
  )
}

function Card({
  title,
  children,
  copyText,
  footer
}: {
  title: string
  children: React.ReactNode
  copyText?: string
  footer?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
        {copyText !== undefined && <CopyButton text={copyText} />}
      </div>
      {children}
      {footer && <div className="mt-3 flex justify-end">{footer}</div>}
    </div>
  )
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/10"
    >
      <CopyIcon width={13} height={13} />
      {copied ? 'Copied!' : label ?? 'Copy'}
    </button>
  )
}
