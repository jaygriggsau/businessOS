import { useMemo, useState } from 'react'
import type { Invoice, InvoiceStatus } from '@shared/types'
import { formatMoney, invoiceTotal } from '@shared/money'
import { useAsync } from '../../lib/useAsync'
import { Badge, Button, EmptyState } from '../../lib/ui'
import { InvoiceIcon, PlusIcon, SearchIcon } from '../../os/icons'
import InvoiceEditor from './InvoiceEditor'

const STATUS_COLORS: Record<InvoiceStatus, 'slate' | 'blue' | 'green' | 'red'> = {
  draft: 'slate',
  sent: 'blue',
  paid: 'green',
  overdue: 'red'
}

export default function InvoiceApp() {
  const { data: invoices, loading, reload } = useAsync(() => window.api.invoices.list())
  const [editing, setEditing] = useState<Invoice | 'new' | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')

  const filtered = useMemo(() => {
    let list = invoices ?? []
    if (statusFilter !== 'all') list = list.filter((i) => i.status === statusFilter)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (i) => i.number.toLowerCase().includes(q) || i.contactName.toLowerCase().includes(q)
      )
    }
    return list
  }, [invoices, query, statusFilter])

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-2.5 py-1.5">
          <SearchIcon width={16} height={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoices…"
            className="selectable w-48 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                statusFilter === s
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:bg-white/10'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button variant="primary" onClick={() => setEditing('new')}>
          <PlusIcon width={16} height={16} /> New invoice
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<InvoiceIcon width={40} height={40} />}
            title={query || statusFilter !== 'all' ? 'No matching invoices' : 'No invoices yet'}
            hint="Create your first invoice to start billing customers."
            action={
              <Button variant="primary" onClick={() => setEditing('new')}>
                <PlusIcon width={16} height={16} /> New invoice
              </Button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/90 text-left text-xs uppercase tracking-wide text-slate-500 backdrop-blur">
              <tr>
                <th className="px-4 py-2 font-medium">Number</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => setEditing(inv)}
                  className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
                >
                  <td className="px-4 py-2.5 font-medium text-slate-200">{inv.number}</td>
                  <td className="px-4 py-2.5 text-slate-300">{inv.contactName || '—'}</td>
                  <td className="px-4 py-2.5">
                    <Badge color={STATUS_COLORS[inv.status]}>{inv.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{inv.dueDate}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-100">
                    {formatMoney(invoiceTotal(inv.items, inv.taxRate))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <InvoiceEditor
          invoice={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </div>
  )
}
