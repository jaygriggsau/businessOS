# businessOS

An operating-system-style desktop suite for local business owners. businessOS
runs as a native Windows application (`.exe`) and presents a familiar desktop
environment — a wallpaper, a dock, app icons, and draggable/resizable windows —
where each business tool runs as its own app.

All data lives locally in a SQLite database on the owner's machine. Nothing is
sent to the cloud.

## Apps included

| App | What it does |
| --- | --- |
| **Dashboard** | At-a-glance stats: contacts, invoices, outstanding & paid revenue |
| **CRM** | Manage contacts, leads and customers |
| **Invoicing** | Create and track invoices with line items, tax and payment status |
| **Settings** | Version, data location and backup guidance |

More apps (Expenses, Scheduling, Inventory, …) can be added by dropping a new
entry into `src/renderer/src/os/apps.tsx`.

## Tech stack

- **Electron** — packages the app into a Windows `.exe`
- **React + TypeScript** — the desktop shell and apps (renderer process)
- **electron-vite** — bundles the main, preload and renderer processes
- **better-sqlite3** — fast, synchronous, local SQLite storage (main process)
- **Tailwind CSS** — styling
- **Zustand** — the window-manager state store
- **electron-builder** — produces the installer / portable `.exe`

## Architecture

```
src/
  main/        Electron main process
    db/        SQLite schema + queries (contacts, invoices, dashboard)
    ipc.ts     Typed IPC handlers (namespace:action channels)
    index.ts   Window creation & app bootstrap
  preload/     contextBridge — exposes a typed `window.api` to the UI
  shared/      Domain types & money helpers shared by both sides
  renderer/    React UI
    src/os/    The "OS": window manager, dock, launcher, desktop
    src/apps/  Individual apps (dashboard, crm, invoice, settings)
    src/lib/   Shared UI kit and hooks
```

The renderer never touches the database directly. It calls `window.api.*`,
which the preload bridge forwards over IPC to handlers in the main process that
run the SQLite queries. This keeps the UI sandboxed (`contextIsolation: true`,
`nodeIntegration: false`).

## Getting started

```bash
npm install        # installs deps and rebuilds better-sqlite3 for Electron
npm run dev         # launch the app in development with hot reload
```

### Type-checking

```bash
npm run typecheck
```

### Building the Windows .exe

On (or targeting) Windows:

```bash
npm run dist        # produces an NSIS installer in release/
```

> Building a Windows installer is easiest **on Windows**. Cross-building from
> Linux/macOS is possible with Wine but not required for development.

The database file is created on first run at Electron's `userData` path
(e.g. `%APPDATA%/businessOS/businessos.sqlite` on Windows). Back it up by
copying that file — its exact location is shown in **Settings**.
