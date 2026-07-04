import type { AppSettings } from '@shared/types'
import { getDb } from './index'

// Maps the flat AppSettings shape onto individual key/value rows.
const KEYS: Record<keyof AppSettings, string> = {
  anthropicApiKey: 'anthropic_api_key',
  businessName: 'business_name',
  businessIndustry: 'business_industry'
}

const DEFAULTS: AppSettings = {
  anthropicApiKey: '',
  businessName: '',
  businessIndustry: ''
}

export function getSettings(): AppSettings {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as Array<{
    key: string
    value: string
  }>
  const byKey = new Map(rows.map((r) => [r.key, r.value]))

  const result = { ...DEFAULTS }
  for (const field of Object.keys(KEYS) as Array<keyof AppSettings>) {
    const stored = byKey.get(KEYS[field])
    if (stored !== undefined) result[field] = stored
  }
  return result
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const stmt = getDb().prepare(
    `INSERT INTO settings (key, value) VALUES (@key, @value)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  )
  const run = getDb().transaction(() => {
    for (const field of Object.keys(partial) as Array<keyof AppSettings>) {
      const value = partial[field]
      if (value !== undefined) stmt.run({ key: KEYS[field], value })
    }
  })
  run()
  return getSettings()
}
