import type { Invoice, InvoiceInput, InvoiceItem } from '@shared/types'
import { getDb } from './index'

interface InvoiceRow {
  id: number
  number: string
  contact_id: number | null
  contact_name: string
  status: string
  issue_date: string
  due_date: string
  notes: string
  tax_rate: number
  created_at: string
  updated_at: string
}

interface InvoiceItemRow {
  id: number
  invoice_id: number
  description: string
  quantity: number
  unit_price: number
}

function toItem(row: InvoiceItemRow): InvoiceItem {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    description: row.description,
    quantity: row.quantity,
    unitPrice: row.unit_price
  }
}

function loadItems(invoiceId: number): InvoiceItem[] {
  const rows = getDb()
    .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC')
    .all(invoiceId) as InvoiceItemRow[]
  return rows.map(toItem)
}

function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    number: row.number,
    contactId: row.contact_id,
    contactName: row.contact_name,
    status: row.status as Invoice['status'],
    issueDate: row.issue_date,
    dueDate: row.due_date,
    notes: row.notes,
    taxRate: row.tax_rate,
    items: loadItems(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listInvoices(): Invoice[] {
  const rows = getDb()
    .prepare('SELECT * FROM invoices ORDER BY issue_date DESC, id DESC')
    .all() as InvoiceRow[]
  return rows.map(toInvoice)
}

export function getInvoice(id: number): Invoice | null {
  const row = getDb().prepare('SELECT * FROM invoices WHERE id = ?').get(id) as
    | InvoiceRow
    | undefined
  return row ? toInvoice(row) : null
}

const db = () => getDb()

function replaceItems(invoiceId: number, items: InvoiceInput['items']): void {
  db().prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(invoiceId)
  const insert = db().prepare(
    `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price)
     VALUES (?, ?, ?, ?)`
  )
  for (const item of items) {
    insert.run(invoiceId, item.description ?? '', item.quantity ?? 0, item.unitPrice ?? 0)
  }
}

export function createInvoice(input: InvoiceInput): Invoice {
  const run = db().transaction((): number => {
    const info = db()
      .prepare(
        `INSERT INTO invoices
           (number, contact_id, contact_name, status, issue_date, due_date, notes, tax_rate)
         VALUES (@number, @contactId, @contactName, @status, @issueDate, @dueDate, @notes, @taxRate)`
      )
      .run({
        number: input.number,
        contactId: input.contactId,
        contactName: input.contactName ?? '',
        status: input.status ?? 'draft',
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        notes: input.notes ?? '',
        taxRate: input.taxRate ?? 0
      })
    const id = Number(info.lastInsertRowid)
    replaceItems(id, input.items ?? [])
    return id
  })
  return getInvoice(run())!
}

export function updateInvoice(id: number, input: InvoiceInput): Invoice {
  const existing = getInvoice(id)
  if (!existing) throw new Error(`Invoice ${id} not found`)

  const run = db().transaction(() => {
    db()
      .prepare(
        `UPDATE invoices SET
           number = @number, contact_id = @contactId, contact_name = @contactName,
           status = @status, issue_date = @issueDate, due_date = @dueDate,
           notes = @notes, tax_rate = @taxRate, updated_at = datetime('now')
         WHERE id = @id`
      )
      .run({
        id,
        number: input.number,
        contactId: input.contactId,
        contactName: input.contactName ?? '',
        status: input.status,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        notes: input.notes ?? '',
        taxRate: input.taxRate ?? 0
      })
    replaceItems(id, input.items ?? [])
  })
  run()
  return getInvoice(id)!
}

export function deleteInvoice(id: number): void {
  db().prepare('DELETE FROM invoices WHERE id = ?').run(id)
}

/**
 * Suggest the next sequential invoice number in the form INV-YYYY-NNNN,
 * scoped to the current year.
 */
export function nextInvoiceNumber(year: number): string {
  const prefix = `INV-${year}-`
  const rows = db()
    .prepare('SELECT number FROM invoices WHERE number LIKE ?')
    .all(`${prefix}%`) as Array<{ number: string }>

  let max = 0
  for (const { number } of rows) {
    const seq = Number.parseInt(number.slice(prefix.length), 10)
    if (Number.isFinite(seq) && seq > max) max = seq
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}
