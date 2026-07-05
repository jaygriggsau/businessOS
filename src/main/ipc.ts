import { app, ipcMain } from 'electron'
import type {
  AppSettings,
  ContactInput,
  DocInput,
  InvoiceInput,
  SocialInput,
  WriterRequest
} from '@shared/types'
import {
  createContact,
  deleteContact,
  getContact,
  listContacts,
  updateContact
} from './db/contacts'
import {
  createInvoice,
  deleteInvoice,
  getInvoice,
  listInvoices,
  nextInvoiceNumber,
  updateInvoice
} from './db/invoices'
import { getDashboardStats } from './db/dashboard'
import { getSettings, saveSettings } from './db/settings'
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  updateDocument
} from './db/documents'
import { fetchFacebookSample } from './ai/facebook'
import { generateSocialPost } from './ai/social'
import { enhanceText } from './ai/writer'
import { exportDocx, importDocx } from './docx'
import { getDbPath } from './db'

/**
 * Register every IPC handler. Channel names mirror the BusinessApi shape
 * exposed through the preload bridge (namespace:action).
 */
export function registerIpcHandlers(): void {
  // ---- Contacts ----
  ipcMain.handle('contacts:list', () => listContacts())
  ipcMain.handle('contacts:get', (_e, id: number) => getContact(id))
  ipcMain.handle('contacts:create', (_e, input: ContactInput) => createContact(input))
  ipcMain.handle('contacts:update', (_e, id: number, input: Partial<ContactInput>) =>
    updateContact(id, input)
  )
  ipcMain.handle('contacts:remove', (_e, id: number) => deleteContact(id))

  // ---- Invoices ----
  ipcMain.handle('invoices:list', () => listInvoices())
  ipcMain.handle('invoices:get', (_e, id: number) => getInvoice(id))
  ipcMain.handle('invoices:create', (_e, input: InvoiceInput) => createInvoice(input))
  ipcMain.handle('invoices:update', (_e, id: number, input: InvoiceInput) =>
    updateInvoice(id, input)
  )
  ipcMain.handle('invoices:remove', (_e, id: number) => deleteInvoice(id))
  ipcMain.handle('invoices:nextNumber', () => nextInvoiceNumber(new Date().getFullYear()))

  // ---- Dashboard ----
  ipcMain.handle('dashboard:stats', () => getDashboardStats())

  // ---- Settings ----
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:save', (_e, settings: Partial<AppSettings>) =>
    saveSettings(settings)
  )

  // ---- Social media generator ----
  ipcMain.handle('social:fetchSample', (_e, url: string) => fetchFacebookSample(url))
  ipcMain.handle('social:generate', (_e, input: SocialInput) => generateSocialPost(input))

  // ---- Documents ----
  ipcMain.handle('documents:list', () => listDocuments())
  ipcMain.handle('documents:get', (_e, id: number) => getDocument(id))
  ipcMain.handle('documents:create', (_e, input: DocInput) => createDocument(input))
  ipcMain.handle('documents:update', (_e, id: number, input: Partial<DocInput>) =>
    updateDocument(id, input)
  )
  ipcMain.handle('documents:remove', (_e, id: number) => deleteDocument(id))
  ipcMain.handle('documents:importDocx', () => importDocx())
  ipcMain.handle('documents:exportDocx', (_e, html: string, title: string) =>
    exportDocx(html, title)
  )

  // ---- AI writer ----
  ipcMain.handle('writer:enhance', (_e, request: WriterRequest) => enhanceText(request))

  // ---- System ----
  ipcMain.handle('system:version', () => app.getVersion())
  ipcMain.handle('system:dataPath', () => getDbPath())
}
