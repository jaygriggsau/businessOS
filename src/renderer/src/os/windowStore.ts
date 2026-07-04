import { create } from 'zustand'

export interface WinBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface WinState extends WinBounds {
  id: string
  appId: string
  title: string
  zIndex: number
  minimized: boolean
  maximized: boolean
  /** Saved floating bounds so we can restore after un-maximizing. */
  restoreBounds: WinBounds | null
}

interface WindowStore {
  windows: WinState[]
  activeId: string | null
  nextZ: number
  seq: number
  openApp: (appId: string, opts?: { title?: string; singleton?: boolean }) => void
  close: (id: string) => void
  focus: (id: string) => void
  minimize: (id: string) => void
  toggleMinimize: (id: string) => void
  toggleMaximize: (id: string) => void
  setBounds: (id: string, bounds: Partial<WinBounds>) => void
  setTitle: (id: string, title: string) => void
}

const DEFAULT_SIZE = { width: 880, height: 560 }

/** Cascade new windows so they don't stack exactly on top of each other. */
function cascadeOffset(seq: number): { x: number; y: number } {
  const step = 28
  const wrapped = seq % 6
  return { x: 120 + wrapped * step, y: 80 + wrapped * step }
}

export const useWindows = create<WindowStore>((set, get) => ({
  windows: [],
  activeId: null,
  nextZ: 1,
  seq: 0,

  openApp: (appId, opts) => {
    const { windows, focus } = get()
    if (opts?.singleton) {
      const existing = windows.find((w) => w.appId === appId)
      if (existing) {
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === existing.id ? { ...w, minimized: false } : w
          )
        }))
        focus(existing.id)
        return
      }
    }

    set((s) => {
      const { x, y } = cascadeOffset(s.seq)
      const id = `win-${s.seq + 1}`
      const z = s.nextZ + 1
      const win: WinState = {
        id,
        appId,
        title: opts?.title ?? appId,
        x,
        y,
        width: DEFAULT_SIZE.width,
        height: DEFAULT_SIZE.height,
        zIndex: z,
        minimized: false,
        maximized: false,
        restoreBounds: null
      }
      return {
        windows: [...s.windows, win],
        activeId: id,
        nextZ: z,
        seq: s.seq + 1
      }
    })
  },

  close: (id) =>
    set((s) => {
      const windows = s.windows.filter((w) => w.id !== id)
      const activeId =
        s.activeId === id
          ? [...windows].filter((w) => !w.minimized).sort((a, b) => b.zIndex - a.zIndex)[0]
              ?.id ?? null
          : s.activeId
      return { windows, activeId }
    }),

  focus: (id) =>
    set((s) => {
      const z = s.nextZ + 1
      return {
        nextZ: z,
        activeId: id,
        windows: s.windows.map((w) =>
          w.id === id ? { ...w, zIndex: z, minimized: false } : w
        )
      }
    }),

  minimize: (id) =>
    set((s) => {
      const remaining = s.windows
        .filter((w) => w.id !== id && !w.minimized)
        .sort((a, b) => b.zIndex - a.zIndex)
      return {
        windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
        activeId: s.activeId === id ? remaining[0]?.id ?? null : s.activeId
      }
    }),

  toggleMinimize: (id) => {
    const win = get().windows.find((w) => w.id === id)
    if (!win) return
    if (win.minimized || get().activeId !== id) get().focus(id)
    else get().minimize(id)
  },

  toggleMaximize: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => {
        if (w.id !== id) return w
        if (w.maximized) {
          const b = w.restoreBounds ?? { x: w.x, y: w.y, width: w.width, height: w.height }
          return { ...w, maximized: false, ...b, restoreBounds: null }
        }
        return {
          ...w,
          maximized: true,
          restoreBounds: { x: w.x, y: w.y, width: w.width, height: w.height }
        }
      })
    })),

  setBounds: (id, bounds) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, ...bounds } : w))
    })),

  setTitle: (id, title) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, title } : w))
    }))
}))
