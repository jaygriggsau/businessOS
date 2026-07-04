import { useEffect, useState } from 'react'
import type { AppSettings } from '@shared/types'
import { useAsync } from '../../lib/useAsync'
import { Button, Field, Input } from '../../lib/ui'
import { APPS } from '../../os/apps'

export default function SettingsApp() {
  const { data: version } = useAsync(() => window.api.system.version())
  const { data: dataPath } = useAsync(() => window.api.system.dataPath())
  const { data: settings } = useAsync(() => window.api.settings.get())

  return (
    <div className="h-full overflow-y-auto p-6">
      <header className="mb-6 flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white">
          b
        </span>
        <div>
          <h1 className="text-xl font-semibold text-white">businessOS</h1>
          <p className="text-sm text-slate-400">
            The operating system for your local business.
          </p>
        </div>
      </header>

      {settings && <BusinessSettings initial={settings} />}

      <Section title="About">
        <InfoRow label="Version" value={version ?? '…'} />
        <InfoRow label="Platform" value="Windows desktop (Electron)" />
        <InfoRow label="Data storage" value="Local SQLite (on this device)" />
        <InfoRow label="Database file" value={dataPath ?? '…'} mono />
      </Section>

      <Section title="Installed apps">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {APPS.map((app) => (
            <div
              key={app.id}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-900/50 p-3"
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${app.accent} text-white`}
              >
                <app.icon width={18} height={18} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">{app.name}</p>
                <p className="truncate text-xs text-slate-500">{app.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Your data">
        <p className="text-sm text-slate-400">
          All CRM and invoicing data is stored privately on this computer — nothing is sent to
          the cloud. To back up your business data, copy the database file shown above to a safe
          location.
        </p>
      </Section>
    </div>
  )
}

function BusinessSettings({ initial }: { initial: AppSettings }) {
  const [form, setForm] = useState<AppSettings>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => setForm(initial), [initial])

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      await window.api.settings.save(form)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const usingProxy = Boolean(form.proxyUrl.trim())

  return (
    <Section title="Business & AI">
      <p className="mb-3 text-xs text-slate-400">
        Social Studio needs AI access. Use your own Anthropic key, <em>or</em> a shared proxy
        URL your organization runs.
      </p>

      <div className="rounded-lg border border-white/5 bg-slate-800/30 p-3">
        <p className="mb-2 text-xs font-semibold text-slate-300">Shared proxy (optional)</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Proxy URL">
            <Input
              value={form.proxyUrl}
              onChange={(e) => set('proxyUrl', e.target.value)}
              placeholder="https://your-proxy.onrender.com"
            />
          </Field>
          <Field label="Access code">
            <Input
              type="password"
              value={form.proxyAccessCode}
              onChange={(e) => set('proxyAccessCode', e.target.value)}
              placeholder="your-team-code"
            />
          </Field>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          When a proxy URL is set, the app routes through it and ignores the key below — the
          real key stays on the server, never on this device.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label={`Anthropic API key${usingProxy ? ' (ignored — proxy in use)' : ''}`}>
            <Input
              type="password"
              value={form.anthropicApiKey}
              onChange={(e) => set('anthropicApiKey', e.target.value)}
              placeholder="sk-ant-…"
              disabled={usingProxy}
            />
          </Field>
          <p className="mt-1 text-[11px] text-slate-500">
            Get a key at console.anthropic.com. It’s stored locally on this device and only
            used to generate your posts.
          </p>
        </div>
        <Field label="Business name">
          <Input
            value={form.businessName}
            onChange={(e) => set('businessName', e.target.value)}
            placeholder="Bean & Brew Coffee"
          />
        </Field>
        <Field label="Industry">
          <Input
            value={form.businessIndustry}
            onChange={(e) => set('businessIndustry', e.target.value)}
            placeholder="Coffee shop"
          />
        </Field>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-emerald-400">Saved ✓</span>}
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </Section>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-semibold text-slate-300">{title}</h2>
      <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4">{children}</div>
    </section>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={`selectable text-right text-sm text-slate-200 ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}
