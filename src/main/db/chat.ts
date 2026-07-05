import type { ChatMessage, ChatRole } from '@shared/types'
import { getDb } from './index'

interface ChatRow {
  id: number
  role: string
  content: string
  created_at: string
}

function toMessage(row: ChatRow): ChatMessage {
  return {
    id: row.id,
    role: row.role as ChatRole,
    content: row.content,
    createdAt: row.created_at
  }
}

export function listMessages(): ChatMessage[] {
  const rows = getDb()
    .prepare('SELECT * FROM chat_messages ORDER BY id ASC')
    .all() as ChatRow[]
  return rows.map(toMessage)
}

export function addMessage(role: ChatRole, content: string): ChatMessage {
  const info = getDb()
    .prepare('INSERT INTO chat_messages (role, content) VALUES (?, ?)')
    .run(role, content)
  const row = getDb()
    .prepare('SELECT * FROM chat_messages WHERE id = ?')
    .get(Number(info.lastInsertRowid)) as ChatRow
  return toMessage(row)
}

export function clearMessages(): void {
  getDb().prepare('DELETE FROM chat_messages').run()
}
