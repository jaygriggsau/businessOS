import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'

let db: Database.Database | null = null

/**
 * Open (and lazily create) the SQLite database that backs businessOS.
 * The file lives in the OS-appropriate userData directory so it survives
 * app updates and is never bundled inside the read-only app package.
 */
export function getDb(): Database.Database {
  if (db) return db

  const file = join(app.getPath('userData'), 'businessos.sqlite')
  db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

export function getDbPath(): string {
  return join(app.getPath('userData'), 'businessos.sqlite')
}

/**
 * Simple forward-only migration runner keyed off PRAGMA user_version.
 * Add a new entry to `migrations` for every schema change; never edit an
 * existing one once it has shipped.
 */
function migrate(database: Database.Database): void {
  const migrations: Array<(d: Database.Database) => void> = [
    // v1 — initial schema
    (d) => {
      d.exec(`
        CREATE TABLE contacts (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          name       TEXT NOT NULL,
          company    TEXT NOT NULL DEFAULT '',
          email      TEXT NOT NULL DEFAULT '',
          phone      TEXT NOT NULL DEFAULT '',
          status     TEXT NOT NULL DEFAULT 'lead',
          notes      TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE invoices (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          number       TEXT NOT NULL UNIQUE,
          contact_id   INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
          contact_name TEXT NOT NULL DEFAULT '',
          status       TEXT NOT NULL DEFAULT 'draft',
          issue_date   TEXT NOT NULL DEFAULT (date('now')),
          due_date     TEXT NOT NULL DEFAULT (date('now')),
          notes        TEXT NOT NULL DEFAULT '',
          tax_rate     REAL NOT NULL DEFAULT 0,
          created_at   TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE invoice_items (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          description TEXT NOT NULL DEFAULT '',
          quantity    REAL NOT NULL DEFAULT 1,
          unit_price  REAL NOT NULL DEFAULT 0
        );

        CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
        CREATE INDEX idx_invoices_contact ON invoices(contact_id);
      `)
    },
    // v2 — key/value settings (API keys, business profile)
    (d) => {
      d.exec(`
        CREATE TABLE settings (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL DEFAULT ''
        );
      `)
    },
    // v3 — documents (rich-text Word editor)
    (d) => {
      d.exec(`
        CREATE TABLE documents (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          title      TEXT NOT NULL DEFAULT 'Untitled document',
          content    TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `)
    }
  ]

  const current = database.pragma('user_version', { simple: true }) as number
  for (let version = current; version < migrations.length; version++) {
    const run = database.transaction(() => {
      migrations[version](database)
      database.pragma(`user_version = ${version + 1}`)
    })
    run()
  }
}
