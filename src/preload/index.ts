import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  BusinessApi,
  ChatChunk,
  ContactInput,
  DocInput,
  InvoiceInput,
  SocialInput,
  WriterRequest
} from '../shared/types'

const api: BusinessApi = {
  contacts: {
    list: () => ipcRenderer.invoke('contacts:list'),
    get: (id) => ipcRenderer.invoke('contacts:get', id),
    create: (input: ContactInput) => ipcRenderer.invoke('contacts:create', input),
    update: (id, input) => ipcRenderer.invoke('contacts:update', id, input),
    remove: (id) => ipcRenderer.invoke('contacts:remove', id)
  },
  invoices: {
    list: () => ipcRenderer.invoke('invoices:list'),
    get: (id) => ipcRenderer.invoke('invoices:get', id),
    create: (input: InvoiceInput) => ipcRenderer.invoke('invoices:create', input),
    update: (id, input) => ipcRenderer.invoke('invoices:update', id, input),
    remove: (id) => ipcRenderer.invoke('invoices:remove', id),
    nextNumber: () => ipcRenderer.invoke('invoices:nextNumber')
  },
  dashboard: {
    stats: () => ipcRenderer.invoke('dashboard:stats')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:save', settings)
  },
  social: {
    fetchSample: (url: string) => ipcRenderer.invoke('social:fetchSample', url),
    generate: (input: SocialInput) => ipcRenderer.invoke('social:generate', input)
  },
  documents: {
    list: () => ipcRenderer.invoke('documents:list'),
    get: (id) => ipcRenderer.invoke('documents:get', id),
    create: (input: DocInput) => ipcRenderer.invoke('documents:create', input),
    update: (id, input) => ipcRenderer.invoke('documents:update', id, input),
    remove: (id) => ipcRenderer.invoke('documents:remove', id),
    importDocx: () => ipcRenderer.invoke('documents:importDocx'),
    exportDocx: (html: string, title: string) =>
      ipcRenderer.invoke('documents:exportDocx', html, title)
  },
  writer: {
    enhance: (request: WriterRequest) => ipcRenderer.invoke('writer:enhance', request)
  },
  chat: {
    history: () => ipcRenderer.invoke('chat:history'),
    send: (requestId: string, content: string) =>
      ipcRenderer.invoke('chat:send', requestId, content),
    clear: () => ipcRenderer.invoke('chat:clear'),
    onChunk: (cb: (chunk: ChatChunk) => void) => {
      const listener = (_e: unknown, chunk: ChatChunk) => cb(chunk)
      ipcRenderer.on('chat:chunk', listener)
      return () => ipcRenderer.removeListener('chat:chunk', listener)
    }
  },
  system: {
    version: () => ipcRenderer.invoke('system:version'),
    dataPath: () => ipcRenderer.invoke('system:dataPath')
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('api', api)
} else {
  // Fallback for the (disabled) non-isolated case.
  // @ts-ignore — window is augmented in index.d.ts
  window.api = api
}
