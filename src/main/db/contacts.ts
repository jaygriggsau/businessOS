import type { Contact, ContactInput } from '@shared/types'
import { getDb } from './index'

interface ContactRow {
  id: number
  name: string
  company: string
  email: string
  phone: string
  status: string
  notes: string
  created_at: string
  updated_at: string
}

function toContact(row: ContactRow): Contact {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    status: row.status as Contact['status'],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listContacts(): Contact[] {
  const rows = getDb()
    .prepare('SELECT * FROM contacts ORDER BY name COLLATE NOCASE ASC')
    .all() as ContactRow[]
  return rows.map(toContact)
}

export function getContact(id: number): Contact | null {
  const row = getDb().prepare('SELECT * FROM contacts WHERE id = ?').get(id) as
    | ContactRow
    | undefined
  return row ? toContact(row) : null
}

export function createContact(input: ContactInput): Contact {
  const info = getDb()
    .prepare(
      `INSERT INTO contacts (name, company, email, phone, status, notes)
       VALUES (@name, @company, @email, @phone, @status, @notes)`
    )
    .run({
      name: input.name,
      company: input.company ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      status: input.status ?? 'lead',
      notes: input.notes ?? ''
    })
  return getContact(Number(info.lastInsertRowid))!
}

export function updateContact(id: number, input: Partial<ContactInput>): Contact {
  const existing = getContact(id)
  if (!existing) throw new Error(`Contact ${id} not found`)

  const merged = { ...existing, ...input }
  getDb()
    .prepare(
      `UPDATE contacts SET
         name = @name, company = @company, email = @email, phone = @phone,
         status = @status, notes = @notes, updated_at = datetime('now')
       WHERE id = @id`
    )
    .run({
      id,
      name: merged.name,
      company: merged.company,
      email: merged.email,
      phone: merged.phone,
      status: merged.status,
      notes: merged.notes
    })
  return getContact(id)!
}

export function deleteContact(id: number): void {
  getDb().prepare('DELETE FROM contacts WHERE id = ?').run(id)
}
