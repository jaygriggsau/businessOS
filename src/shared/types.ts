// Domain types shared between the Electron main process (SQLite layer)
// and the renderer (React UI). Keep this file free of any Node or DOM
// imports so it can be consumed from both sides.

export type ContactStatus = 'lead' | 'customer' | 'inactive'

export interface Contact {
  id: number
  name: string
  company: string
  email: string
  phone: string
  status: ContactStatus
  notes: string
  createdAt: string
  updatedAt: string
}

export type ContactInput = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

export interface InvoiceItem {
  id: number
  invoiceId: number
  description: string
  quantity: number
  unitPrice: number
}

export type InvoiceItemInput = Omit<InvoiceItem, 'id' | 'invoiceId'>

export interface Invoice {
  id: number
  number: string
  contactId: number | null
  contactName: string
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  notes: string
  taxRate: number
  items: InvoiceItem[]
  createdAt: string
  updatedAt: string
}

export interface InvoiceInput {
  number: string
  contactId: number | null
  contactName: string
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  notes: string
  taxRate: number
  items: InvoiceItemInput[]
}

export interface DashboardStats {
  contactCount: number
  customerCount: number
  leadCount: number
  invoiceCount: number
  outstandingTotal: number
  paidTotal: number
}

// ---- Typed IPC surface exposed on window.api via the preload bridge ----

export interface BusinessApi {
  contacts: {
    list: () => Promise<Contact[]>
    get: (id: number) => Promise<Contact | null>
    create: (input: ContactInput) => Promise<Contact>
    update: (id: number, input: Partial<ContactInput>) => Promise<Contact>
    remove: (id: number) => Promise<void>
  }
  invoices: {
    list: () => Promise<Invoice[]>
    get: (id: number) => Promise<Invoice | null>
    create: (input: InvoiceInput) => Promise<Invoice>
    update: (id: number, input: InvoiceInput) => Promise<Invoice>
    remove: (id: number) => Promise<void>
    nextNumber: () => Promise<string>
  }
  dashboard: {
    stats: () => Promise<DashboardStats>
  }
  system: {
    version: () => Promise<string>
    dataPath: () => Promise<string>
  }
}
