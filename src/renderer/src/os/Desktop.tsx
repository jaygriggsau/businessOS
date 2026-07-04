import { useEffect, useState } from 'react'
import { APPS } from './apps'
import { useWindows } from './windowStore'
import Window from './Window'
import Taskbar from './Taskbar'
import Launcher from './Launcher'

export default function Desktop() {
  const windows = useWindows((s) => s.windows)
  const openApp = useWindows((s) => s.openApp)
  const [launcherOpen, setLauncherOpen] = useState(false)

  // Open the Dashboard automatically on first launch.
  useEffect(() => {
    openApp('dashboard', { title: 'Dashboard', singleton: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Wallpaper */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1120] via-[#111a34] to-[#0a1f2e]" />
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-600/25 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-[480px] w-[480px] rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute left-1/3 top-1/4 h-[360px] w-[360px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      {/* Desktop shortcuts */}
      <div className="absolute left-5 top-5 flex flex-col flex-wrap gap-1">
        {APPS.map((app) => (
          <button
            key={app.id}
            onDoubleClick={() =>
              openApp(app.id, { title: app.name, singleton: app.singleton })
            }
            className="group flex w-24 flex-col items-center gap-1.5 rounded-xl p-2 text-center transition hover:bg-white/10"
          >
            <span
              className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${app.accent} text-white shadow-lg transition group-hover:scale-105`}
            >
              <app.icon width={26} height={26} />
            </span>
            <span className="text-xs font-medium text-slate-200 drop-shadow">{app.name}</span>
          </button>
        ))}
      </div>

      {/* Windows */}
      {windows.map((win) => (
        <Window key={win.id} win={win} />
      ))}

      {/* Start menu / launcher */}
      {launcherOpen && <Launcher onClose={() => setLauncherOpen(false)} />}

      {/* Dock */}
      <Taskbar onToggleLauncher={() => setLauncherOpen((o) => !o)} />
    </div>
  )
}
