import type { ReactNode } from 'react'
import { formatMoney } from '@shared/money'
import { useAsync } from '../../lib/useAsync'
import { useWindows } from '../../os/windowStore'
import { CrmIcon, InvoiceIcon } from '../../os/icons'

export default function DashboardApp() {
  const { data: stats, loading } = useAsync(() => window.api.dashboard.stats())
  const openApp = useWindows((s) => s.openApp)

  return (
    <div className="h-full overflow-y-auto p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-white">Good day 👋</h1>
        <p className="text-sm text-slate-400">Here's how your business is doing.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Contacts"
          value={loading ? '—' : String(stats?.contactCount ?? 0)}
          sub={`${stats?.customerCount ?? 0} customers · ${stats?.leadCount ?? 0} leads`}
          accent="from-violet-500 to-indigo-600"
        />
        <StatCard
          label="Invoices"
          value={loading ? '—' : String(stats?.invoiceCount ?? 0)}
          sub="total issued"
          accent="from-emerald-500 to-teal-600"
        />
        <StatCard
          label="Outstanding"
          value={loading ? '—' : formatMoney(stats?.outstandingTotal ?? 0)}
          sub="awaiting payment"
          accent="from-amber-500 to-orange-600"
        />
        <StatCard
          label="Paid"
          value={loading ? '—' : formatMoney(stats?.paidTotal ?? 0)}
          sub="collected"
          accent="from-sky-500 to-blue-600"
        />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-300">Quick actions</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <QuickAction
          icon={<CrmIcon width={22} height={22} />}
          title="Open CRM"
          desc="Manage contacts, leads & customers"
          accent="from-violet-500 to-indigo-600"
          onClick={() => openApp('crm', { title: 'CRM', singleton: true })}
        />
        <QuickAction
          icon={<InvoiceIcon width={22} height={22} />}
          title="Create an invoice"
          desc="Bill a customer and track payment"
          accent="from-emerald-500 to-teal-600"
          onClick={() => openApp('invoice', { title: 'Invoicing', singleton: true })}
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent
}: {
  label: string
  value: string
  sub: string
  accent: string
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
      <div className={`mb-3 h-1.5 w-10 rounded-full bg-gradient-to-r ${accent}`} />
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  )
}

function QuickAction({
  icon,
  title,
  desc,
  accent,
  onClick
}: {
  icon: ReactNode
  title: string
  desc: string
  accent: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 rounded-xl border border-white/5 bg-slate-900/60 p-4 text-left transition hover:border-white/15 hover:bg-slate-800/60"
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${accent} text-white`}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium text-slate-100">{title}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
    </button>
  )
}
