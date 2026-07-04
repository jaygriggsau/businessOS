import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useWindows, type WinState } from './windowStore'
import { getApp } from './apps'
import { CloseIcon, MaximizeIcon, MinimizeIcon } from './icons'

const TASKBAR_HEIGHT = 64
const MIN_W = 380
const MIN_H = 260

interface DragState {
  kind: 'move' | 'resize'
  pointerId: number
  startX: number
  startY: number
  origin: { x: number; y: number; width: number; height: number }
}

export default function Window({ win }: { win: WinState }): ReactNode {
  const { focus, close, minimize, toggleMaximize, setBounds } = useWindows()
  const app = getApp(win.appId)
  const drag = useRef<DragState | null>(null)
  const active = useWindows((s) => s.activeId === win.id)

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY

      if (d.kind === 'move') {
        const maxX = window.innerWidth - 80
        const maxY = window.innerHeight - TASKBAR_HEIGHT - 40
        setBounds(win.id, {
          x: Math.min(Math.max(d.origin.x + dx, -d.origin.width + 120), maxX),
          y: Math.min(Math.max(d.origin.y + dy, 0), maxY)
        })
      } else {
        const maxW = window.innerWidth - win.x - 8
        const maxH = window.innerHeight - TASKBAR_HEIGHT - win.y - 8
        setBounds(win.id, {
          width: Math.min(Math.max(d.origin.width + dx, MIN_W), Math.max(maxW, MIN_W)),
          height: Math.min(Math.max(d.origin.height + dy, MIN_H), Math.max(maxH, MIN_H))
        })
      }
    },
    [setBounds, win.id, win.x, win.y]
  )

  const endDrag = useCallback((e: PointerEvent) => {
    if (drag.current && e.pointerId === drag.current.pointerId) drag.current = null
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [onPointerMove, endDrag])

  if (win.minimized) return null

  const startMove = (e: React.PointerEvent) => {
    focus(win.id)
    if (win.maximized) return
    drag.current = {
      kind: 'move',
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: { x: win.x, y: win.y, width: win.width, height: win.height }
    }
  }

  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation()
    focus(win.id)
    if (win.maximized) return
    drag.current = {
      kind: 'resize',
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: { x: win.x, y: win.y, width: win.width, height: win.height }
    }
  }

  const bounds = win.maximized
    ? { left: 0, top: 0, width: '100%', height: `calc(100% - ${TASKBAR_HEIGHT}px)` }
    : { left: win.x, top: win.y, width: win.width, height: win.height }

  const Body = app?.component

  return (
    <div
      className={`absolute flex flex-col overflow-hidden rounded-xl border shadow-window animate-window-in ${
        active ? 'border-white/15 ring-1 ring-brand-500/30' : 'border-white/5'
      }`}
      style={{ ...bounds, zIndex: win.zIndex }}
      onPointerDown={() => focus(win.id)}
    >
      {/* Title bar */}
      <div
        className="glass flex h-10 shrink-0 items-center gap-2 border-b border-white/5 pl-3 pr-2"
        onPointerDown={startMove}
        onDoubleClick={() => toggleMaximize(win.id)}
      >
        {app && (
          <span
            className={`grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br ${app.accent} text-white`}
          >
            <app.icon width={14} height={14} />
          </span>
        )}
        <span className="flex-1 truncate text-sm font-medium text-slate-200">
          {win.title}
        </span>
        <div className="no-drag flex items-center gap-1">
          <button
            className="grid h-7 w-7 place-items-center rounded-md text-slate-300 hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation()
              minimize(win.id)
            }}
            title="Minimize"
          >
            <MinimizeIcon width={15} height={15} />
          </button>
          <button
            className="grid h-7 w-7 place-items-center rounded-md text-slate-300 hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation()
              toggleMaximize(win.id)
            }}
            title="Maximize"
          >
            <MaximizeIcon width={13} height={13} />
          </button>
          <button
            className="grid h-7 w-7 place-items-center rounded-md text-slate-300 hover:bg-red-500 hover:text-white"
            onClick={(e) => {
              e.stopPropagation()
              close(win.id)
            }}
            title="Close"
          >
            <CloseIcon width={15} height={15} />
          </button>
        </div>
      </div>

      {/* App body */}
      <div className="relative flex-1 overflow-hidden bg-slate-950/95 text-slate-200">
        {Body ? <Body /> : <div className="p-6 text-slate-400">Unknown app.</div>}
      </div>

      {/* Resize handle */}
      {!win.maximized && (
        <div
          className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
          onPointerDown={startResize}
        >
          <svg viewBox="0 0 10 10" className="h-full w-full text-slate-500">
            <path d="M9 1v8H1" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          </svg>
        </div>
      )}
    </div>
  )
}
