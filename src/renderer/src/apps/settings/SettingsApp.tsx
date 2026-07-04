import { useAsync } from '../../lib/useAsync'
import { APPS } from '../../os/apps'

export default function SettingsApp() {
  const { data: version } = useAsync(() => window.api.system.version())
  const { data: dataPath } = useAsync(() => window.api.system.dataPath())

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
