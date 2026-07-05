import { useMemo, useState } from 'react'
import type { Doc } from '@shared/types'
import { useAsync } from '../../lib/useAsync'
import { Button, EmptyState } from '../../lib/ui'
import { DocIcon, DownloadIcon, PlusIcon, SearchIcon } from '../../os/icons'
import DocEditor from './DocEditor'

export default function DocsApp() {
  const { data: docs, loading, reload } = useAsync(() => window.api.documents.list())
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const list = docs ?? []
    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter((d) => d.title.toLowerCase().includes(q))
  }, [docs, query])

  const selected = docs?.find((d) => d.id === selectedId) ?? null

  const createNew = async () => {
    const doc = await window.api.documents.create({
      title: 'Untitled document',
      content: ''
    })
    await reload()
    setSelectedId(doc.id)
  }

  const importDoc = async () => {
    const imported = await window.api.documents.importDocx()
    if (!imported) return
    const doc = await window.api.documents.create(imported)
    await reload()
    setSelectedId(doc.id)
  }

  return (
    <div className="flex h-full">
      {/* Document list */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-white/5 bg-slate-900/40">
        <div className="border-b border-white/5 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-800/60 px-2.5 py-1.5">
            <SearchIcon width={16} height={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents…"
              className="selectable w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>
          <Button variant="primary" className="w-full" onClick={createNew}>
            <PlusIcon width={16} height={16} /> New document
          </Button>
          <Button variant="secondary" className="mt-2 w-full" onClick={importDoc}>
            <DownloadIcon width={15} height={15} /> Import .docx
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <p className="p-4 text-sm text-slate-500">No documents yet.</p>
          )}
          {filtered.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              className={`flex w-full flex-col gap-0.5 border-b border-white/5 px-3 py-2.5 text-left transition ${
                selectedId === d.id ? 'bg-brand-600/20' : 'hover:bg-white/5'
              }`}
            >
              <span className="truncate text-sm font-medium text-slate-100">
                {d.title || 'Untitled document'}
              </span>
              <span className="truncate text-[11px] text-slate-500">
                {preview(d)} · {formatDate(d.updatedAt)}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Editor */}
      <section className="min-w-0 flex-1">
        {selected ? (
          <DocEditor
            key={selected.id}
            doc={selected}
            onChanged={reload}
            onDeleted={() => {
              setSelectedId(null)
              reload()
            }}
          />
        ) : (
          <EmptyState
            icon={<DocIcon width={40} height={40} />}
            title="Select or create a document"
            hint="Write with a clean editor and polish it with AI — then export to Word."
            action={
              <Button variant="primary" onClick={createNew}>
                <PlusIcon width={16} height={16} /> New document
              </Button>
            }
          />
        )}
      </section>
    </div>
  )
}

function preview(d: Doc): string {
  const text = d.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, 40) : 'Empty'
}

function formatDate(sqlDate: string): string {
  const d = new Date(sqlDate.replace(' ', 'T') + 'Z')
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString()
}
