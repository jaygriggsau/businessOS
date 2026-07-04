import { APPS, getApp } from './apps'
import { useWindows } from './windowStore'
import { GridIcon } from './icons'
import Clock from './Clock'

export default function Taskbar({ onToggleLauncher }: { onToggleLauncher: () => void }) {
  const windows = useWindows((s) => s.windows)
  const activeId = useWindows((s) => s.activeId)
  const openApp = useWindows((s) => s.openApp)
  const toggleMinimize = useWindows((s) => s.toggleMinimize)

  // Apps that are pinned to the dock plus any others with open windows.
  const openAppIds = new Set(windows.map((w) => w.appId))
  const dockApps = APPS.filter((a) => a.id !== 'settings' || openAppIds.has('settings'))

  return (
    <div className="absolute inset-x-0 bottom-0 z-[8000] flex h-16 items-center justify-between px-4">
      <div className="glass flex h-12 items-center gap-1 rounded-2xl border border-white/10 px-2 shadow-window">
        <button
          onClick={onToggleLauncher}
          className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white transition hover:brightness-110"
          title="All apps"
        >
          <GridIcon width={20} height={20} />
        </button>
        <div className="mx-1 h-7 w-px bg-white/10" />

        {dockApps.map((app) => {
          const wins = windows.filter((w) => w.appId === app.id)
          const isOpen = wins.length > 0
          const isActive = wins.some((w) => w.id === activeId && !w.minimized)
          return (
            <button
              key={app.id}
              title={app.name}
              onClick={() => {
                if (wins.length > 0) toggleMinimize(wins[0].id)
                else openApp(app.id, { title: app.name, singleton: app.singleton })
              }}
              className={`relative grid h-10 w-10 place-items-center rounded-xl transition hover:bg-white/10 ${
                isActive ? 'bg-white/10' : ''
              }`}
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${app.accent} text-white`}
              >
                <app.icon width={18} height={18} />
              </span>
              {isOpen && (
                <span
                  className={`absolute -bottom-0.5 left-1/2 h-1 w-1.5 -translate-x-1/2 rounded-full ${
                    isActive ? 'bg-brand-300' : 'bg-slate-400'
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="glass flex h-12 items-center gap-3 rounded-2xl border border-white/10 px-4 shadow-window">
        <TaskList />
        <div className="h-7 w-px bg-white/10" />
        <Clock />
      </div>
    </div>
  )
}

/** Compact list of open windows (minimized ones appear dimmed). */
function TaskList() {
  const windows = useWindows((s) => s.windows)
  const activeId = useWindows((s) => s.activeId)
  const toggleMinimize = useWindows((s) => s.toggleMinimize)

  if (windows.length === 0) {
    return <span className="text-xs text-slate-400">No open windows</span>
  }

  return (
    <div className="flex max-w-[40vw] items-center gap-1 overflow-x-auto">
      {windows.map((w) => {
        const app = getApp(w.appId)
        const isActive = w.id === activeId && !w.minimized
        return (
          <button
            key={w.id}
            onClick={() => toggleMinimize(w.id)}
            className={`flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs transition ${
              isActive
                ? 'bg-white/15 text-white'
                : w.minimized
                  ? 'text-slate-500 hover:bg-white/5'
                  : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            {app && <app.icon width={13} height={13} />}
            <span className="max-w-[100px] truncate">{w.title}</span>
          </button>
        )
      })}
    </div>
  )
}
