import type { Doc, DocInput } from '@shared/types'
import { getDb } from './index'

interface DocRow {
  id: number
  title: string
  content: string
  created_at: string
  updated_at: string
}

function toDoc(row: DocRow): Doc {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listDocuments(): Doc[] {
  const rows = getDb()
    .prepare('SELECT * FROM documents ORDER BY updated_at DESC, id DESC')
    .all() as DocRow[]
  return rows.map(toDoc)
}

export function getDocument(id: number): Doc | null {
  const row = getDb().prepare('SELECT * FROM documents WHERE id = ?').get(id) as
    | DocRow
    | undefined
  return row ? toDoc(row) : null
}

export function createDocument(input: DocInput): Doc {
  const info = getDb()
    .prepare('INSERT INTO documents (title, content) VALUES (@title, @content)')
    .run({ title: input.title || 'Untitled document', content: input.content ?? '' })
  return getDocument(Number(info.lastInsertRowid))!
}

export function updateDocument(id: number, input: Partial<DocInput>): Doc {
  const existing = getDocument(id)
  if (!existing) throw new Error(`Document ${id} not found`)
  const merged = { ...existing, ...input }
  getDb()
    .prepare(
      `UPDATE documents SET title = @title, content = @content, updated_at = datetime('now')
       WHERE id = @id`
    )
    .run({ id, title: merged.title, content: merged.content })
  return getDocument(id)!
}

export function deleteDocument(id: number): void {
  getDb().prepare('DELETE FROM documents WHERE id = ?').run(id)
}
