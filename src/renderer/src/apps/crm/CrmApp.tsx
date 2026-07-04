import { useMemo, useState } from 'react'
import type { Contact, ContactInput, ContactStatus } from '@shared/types'
import { useAsync } from '../../lib/useAsync'
import { Badge, Button, Field, Input, Select, Textarea, EmptyState } from '../../lib/ui'
import { CrmIcon, PlusIcon, SearchIcon, TrashIcon } from '../../os/icons'

const STATUS_COLORS: Record<ContactStatus, 'green' | 'amber' | 'slate'> = {
  customer: 'green',
  lead: 'amber',
  inactive: 'slate'
}

const EMPTY: ContactInput = {
  name: '',
  company: '',
  email: '',
  phone: '',
  status: 'lead',
  notes: ''
}

export default function CrmApp() {
  const { data: contacts, loading, reload } = useAsync(() => window.api.contacts.list())
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const list = contacts ?? []
    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter((c) =>
      [c.name, c.company, c.email, c.phone].some((f) => f.toLowerCase().includes(q))
    )
  }, [contacts, query])

  const selected = contacts?.find((c) => c.id === selectedId) ?? null

  const startNew = () => {
    setCreating(true)
    setSelectedId(null)
  }

  return (
    <div className="flex h-full">
      {/* List pane */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-white/5 bg-slate-900/40">
        <div className="border-b border-white/5 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-800/60 px-2.5 py-1.5">
            <SearchIcon width={16} height={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts…"
              className="selectable w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>
          <Button variant="primary" className="w-full" onClick={startNew}>
            <PlusIcon width={16} height={16} /> New contact
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <p className="p-4 text-sm text-slate-500">No contacts yet.</p>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedId(c.id)
                setCreating(false)
              }}
              className={`flex w-full items-center gap-3 border-b border-white/5 px-3 py-2.5 text-left transition ${
                selectedId === c.id ? 'bg-brand-600/20' : 'hover:bg-white/5'
              }`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-semibold text-white">
                {initials(c.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{c.name}</p>
                <p className="truncate text-xs text-slate-500">{c.company || c.email || '—'}</p>
              </div>
              <Badge color={STATUS_COLORS[c.status]}>{c.status}</Badge>
            </button>
          ))}
        </div>
      </aside>

      {/* Detail pane */}
      <section className="flex-1 overflow-y-auto">
        {creating ? (
          <ContactEditor
            key="new"
            initial={EMPTY}
            onCancel={() => setCreating(false)}
            onSave={async (input) => {
              const created = await window.api.contacts.create(input)
              setCreating(false)
              setSelectedId(created.id)
              reload()
            }}
          />
        ) : selected ? (
          <ContactEditor
            key={selected.id}
            contact={selected}
            initial={toInput(selected)}
            onCancel={() => setSelectedId(null)}
            onDelete={async () => {
              await window.api.contacts.remove(selected.id)
              setSelectedId(null)
              reload()
            }}
            onSave={async (input) => {
              await window.api.contacts.update(selected.id, input)
              reload()
            }}
          />
        ) : (
          <EmptyState
            icon={<CrmIcon width={40} height={40} />}
            title="Select a contact"
            hint="Choose someone from the list, or add a new contact to get started."
            action={
              <Button variant="primary" onClick={startNew}>
                <PlusIcon width={16} height={16} /> New contact
              </Button>
            }
          />
        )}
      </section>
    </div>
  )
}

function ContactEditor({
  contact,
  initial,
  onSave,
  onCancel,
  onDelete
}: {
  contact?: Contact
  initial: ContactInput
  onSave: (input: ContactInput) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}) {
  const [form, setForm] = useState<ContactInput>(initial)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof ContactInput>(key: K, value: ContactInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const submit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {contact ? 'Edit contact' : 'New contact'}
        </h2>
        {onDelete && (
          <Button variant="danger" onClick={onDelete} title="Delete contact">
            <TrashIcon width={15} height={15} /> Delete
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Name *">
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Jane Doe"
            />
          </Field>
        </div>
        <Field label="Company">
          <Input value={form.company} onChange={(e) => set('company', e.target.value)} />
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(e) => set('status', e.target.value as ContactStatus)}
          >
            <option value="lead">Lead</option>
            <option value="customer">Customer</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="jane@example.com"
          />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label="Notes">
            <Textarea
              rows={5}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Anything worth remembering about this contact…"
            />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={submit} disabled={saving || !form.name.trim()}>
          {saving ? 'Saving…' : contact ? 'Save changes' : 'Create contact'}
        </Button>
      </div>
    </div>
  )
}

function toInput(c: Contact): ContactInput {
  return {
    name: c.name,
    company: c.company,
    email: c.email,
    phone: c.phone,
    status: c.status,
    notes: c.notes
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || parts[0] === '') return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}
