import { useEffect, useState } from 'react'
import { APPS } from './apps'
import { useWindows } from './windowStore'
import { SearchIcon } from './icons'

export default function Launcher({ onClose }: { onClose: () => void }) {
  const openApp = useWindows((s) => s.openApp)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const results = APPS.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.description.toLowerCase().includes(query.toLowerCase())
  )

  const launch = (id: string, name: string, singleton?: boolean) => {
    openApp(id, { title: name, singleton })
    onClose()
  }

  return (
    <div
      className="absolute inset-0 z-[9000] flex items-start justify-center bg-slate-950/40 pt-24"
      onPointerDown={onClose}
    >
      <div
        className="glass w-[560px] max-w-[90vw] rounded-2xl border border-white/10 p-5 shadow-window"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-2.5">
          <SearchIcon width={18} height={18} className="text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps…"
            className="selectable w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {results.map((app) => (
            <button
              key={app.id}
              onClick={() => launch(app.id, app.name, app.singleton)}
              className="group flex flex-col items-center gap-2 rounded-xl p-3 transition hover:bg-white/10"
            >
              <span
                className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${app.accent} text-white shadow-lg transition group-hover:scale-105`}
              >
                <app.icon width={26} height={26} />
              </span>
              <span className="text-xs font-medium text-slate-200">{app.name}</span>
            </button>
          ))}
          {results.length === 0 && (
            <p className="col-span-4 py-6 text-center text-sm text-slate-400">
              No apps match “{query}”.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
