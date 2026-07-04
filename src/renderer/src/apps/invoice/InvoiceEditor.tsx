import { useEffect, useState } from 'react'
import type {
  Contact,
  Invoice,
  InvoiceInput,
  InvoiceItemInput,
  InvoiceStatus
} from '@shared/types'
import { formatMoney, invoiceTotal, subtotal, taxAmount } from '@shared/money'
import { Button, Field, Input, Modal, Select, Textarea } from '../../lib/ui'
import { PlusIcon, TrashIcon } from '../../os/icons'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDaysISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const BLANK_ITEM: InvoiceItemInput = { description: '', quantity: 1, unitPrice: 0 }

function toInput(inv: Invoice): InvoiceInput {
  return {
    number: inv.number,
    contactId: inv.contactId,
    contactName: inv.contactName,
    status: inv.status,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    notes: inv.notes,
    taxRate: inv.taxRate,
    items: inv.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice
    }))
  }
}

export default function InvoiceEditor({
  invoice,
  onClose,
  onSaved
}: {
  invoice: Invoice | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<InvoiceInput | null>(invoice ? toInput(invoice) : null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [saving, setSaving] = useState(false)

  // Bootstrap: load contacts, and for a new invoice fetch the next number.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      window.api.contacts.list(),
      invoice ? Promise.resolve(null) : window.api.invoices.nextNumber()
    ]).then(([list, number]) => {
      if (cancelled) return
      setContacts(list)
      if (!invoice && number) {
        setForm({
          number,
          contactId: null,
          contactName: '',
          status: 'draft',
          issueDate: todayISO(),
          dueDate: addDaysISO(14),
          notes: '',
          taxRate: 0,
          items: [{ ...BLANK_ITEM }]
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [invoice])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!form) {
    return (
      <Modal title="Invoice" onClose={onClose} wide>
        <p className="p-4 text-sm text-slate-500">Loading…</p>
      </Modal>
    )
  }

  const set = <K extends keyof InvoiceInput>(key: K, value: InvoiceInput[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f))

  const setItem = (index: number, patch: Partial<InvoiceItemInput>) =>
    setForm((f) =>
      f
        ? { ...f, items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }
        : f
    )

  const addItem = () =>
    setForm((f) => (f ? { ...f, items: [...f.items, { ...BLANK_ITEM }] } : f))

  const removeItem = (index: number) =>
    setForm((f) => (f ? { ...f, items: f.items.filter((_, i) => i !== index) } : f))

  const onContactChange = (value: string) => {
    if (value === '') {
      setForm((f) => (f ? { ...f, contactId: null } : f))
      return
    }
    const c = contacts.find((x) => x.id === Number(value))
    setForm((f) =>
      f ? { ...f, contactId: c ? c.id : null, contactName: c ? c.name : f.contactName } : f
    )
  }

  const save = async () => {
    if (!form.number.trim()) return
    setSaving(true)
    try {
      if (invoice) await window.api.invoices.update(invoice.id, form)
      else await window.api.invoices.create(form)
      onSaved()
    } catch (err) {
      // Surface unique-number collisions and similar DB errors.
      alert(err instanceof Error ? err.message : 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!invoice) return
    if (!confirm(`Delete invoice ${invoice.number}? This cannot be undone.`)) return
    await window.api.invoices.remove(invoice.id)
    onSaved()
  }

  const sub = subtotal(form.items)
  const tax = taxAmount(form.items, form.taxRate)
  const total = invoiceTotal(form.items, form.taxRate)

  return (
    <Modal
      title={invoice ? `Edit ${invoice.number}` : 'New invoice'}
      onClose={onClose}
      wide
      footer={
        <>
          {invoice && (
            <Button variant="danger" onClick={remove} className="mr-auto">
              <TrashIcon width={15} height={15} /> Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={saving || !form.number.trim()}>
            {saving ? 'Saving…' : invoice ? 'Save changes' : 'Create invoice'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Invoice number">
          <Input value={form.number} onChange={(e) => set('number', e.target.value)} />
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(e) => set('status', e.target.value as InvoiceStatus)}
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </Select>
        </Field>
        <Field label="Customer">
          <Select value={form.contactId ?? ''} onChange={(e) => onContactChange(e.target.value)}>
            <option value="">— No linked contact —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` · ${c.company}` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Customer name (on invoice)">
          <Input
            value={form.contactName}
            onChange={(e) => set('contactName', e.target.value)}
            placeholder="Shown on the invoice"
          />
        </Field>
        <Field label="Issue date">
          <Input
            type="date"
            value={form.issueDate}
            onChange={(e) => set('issueDate', e.target.value)}
          />
        </Field>
        <Field label="Due date">
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
          />
        </Field>
      </div>

      {/* Line items */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Line items</h3>
          <Button variant="secondary" onClick={addItem}>
            <PlusIcon width={15} height={15} /> Add item
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="w-20 px-3 py-2 text-right font-medium">Qty</th>
                <th className="w-28 px-3 py-2 text-right font-medium">Unit price</th>
                <th className="w-28 px-3 py-2 text-right font-medium">Amount</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-2 py-1.5">
                    <Input
                      value={item.description}
                      onChange={(e) => setItem(i, { description: e.target.value })}
                      placeholder="Service or product"
                      className="w-full"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={item.quantity}
                      onChange={(e) => setItem(i, { quantity: toNumber(e.target.value) })}
                      className="w-full text-right"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) => setItem(i, { unitPrice: toNumber(e.target.value) })}
                      className="w-full text-right"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right text-slate-200">
                    {formatMoney(item.quantity * item.unitPrice)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => removeItem(i)}
                      className="rounded p-1 text-slate-500 hover:bg-red-500/20 hover:text-red-300"
                      title="Remove"
                    >
                      <TrashIcon width={15} height={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {form.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-xs text-slate-500">
                    No line items. Click “Add item”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals + notes */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Field label="Notes">
          <Textarea
            rows={4}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Payment terms, thank-you note…"
          />
        </Field>
        <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-slate-800/40 p-4 text-sm">
          <Row label="Subtotal" value={formatMoney(sub)} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Tax</span>
              <Input
                type="number"
                min={0}
                step="any"
                value={form.taxRate}
                onChange={(e) => set('taxRate', toNumber(e.target.value))}
                className="w-16 py-1 text-right"
              />
              <span className="text-slate-500">%</span>
            </div>
            <span className="text-slate-200">{formatMoney(tax)}</span>
          </div>
          <div className="my-1 h-px bg-white/10" />
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-100">Total</span>
            <span className="text-lg font-semibold text-white">{formatMoney(total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  )
}

function toNumber(value: string): number {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : 0
}
