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

// ---- Social media post generator ----

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'x'

export interface SocialInput {
  /** What the post should be about. */
  topic: string
  /** A sample post whose tone/voice should be matched (may be empty). */
  sampleText: string
  /** The URL the sample was pulled from, for reference (optional). */
  sampleUrl: string
  platform: SocialPlatform
  includeImage: boolean
}

export interface SocialResult {
  post: string
  hashtags: string[]
  imagePrompt: string
  /** Data URL of the generated image, or null if none/failed. */
  imageDataUrl: string | null
  imageError?: string
}

export interface SampleFetchResult {
  ok: boolean
  text: string
  /** Human-readable note about what happened (e.g. why it was blocked). */
  note: string
}

// ---- Documents (Word editor) ----

export interface Doc {
  id: number
  title: string
  /** Rich-text body as HTML. */
  content: string
  createdAt: string
  updatedAt: string
}

export interface DocInput {
  title: string
  content: string
}

/** AI writing actions applied to a selection or the whole document. */
export type WriterAction =
  | 'improve'
  | 'grammar'
  | 'shorten'
  | 'lengthen'
  | 'professional'
  | 'friendly'
  | 'continue'
  | 'summarize'

export interface WriterRequest {
  action: WriterAction
  /** The text to transform (selection, or whole document). */
  text: string
  /** Optional free-form instruction for a custom rewrite. */
  instruction?: string
}

/** App/business configuration persisted in the local settings table. */
export interface AppSettings {
  /** The user's own Anthropic API key. */
  anthropicApiKey: string
  businessName: string
  businessIndustry: string
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
  settings: {
    get: () => Promise<AppSettings>
    save: (settings: Partial<AppSettings>) => Promise<AppSettings>
  }
  social: {
    fetchSample: (url: string) => Promise<SampleFetchResult>
    generate: (input: SocialInput) => Promise<SocialResult>
  }
  documents: {
    list: () => Promise<Doc[]>
    get: (id: number) => Promise<Doc | null>
    create: (input: DocInput) => Promise<Doc>
    update: (id: number, input: Partial<DocInput>) => Promise<Doc>
    remove: (id: number) => Promise<void>
  }
  writer: {
    enhance: (request: WriterRequest) => Promise<string>
  }
  system: {
    version: () => Promise<string>
    dataPath: () => Promise<string>
  }
}
