import type { Invoice, InvoiceItem, InvoiceItemInput } from './types'

/** Line subtotal (quantity * unit price). */
export function lineTotal(item: InvoiceItem | InvoiceItemInput): number {
  return round2(item.quantity * item.unitPrice)
}

/** Sum of all line items before tax. */
export function subtotal(items: Array<InvoiceItem | InvoiceItemInput>): number {
  return round2(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))
}

/** Tax amount given a subtotal and a percentage rate (e.g. 10 = 10%). */
export function taxAmount(items: Array<InvoiceItem | InvoiceItemInput>, taxRate: number): number {
  return round2(subtotal(items) * (taxRate / 100))
}

/** Grand total including tax. */
export function invoiceTotal(
  items: Array<InvoiceItem | InvoiceItemInput>,
  taxRate: number
): number {
  return round2(subtotal(items) + taxAmount(items, taxRate))
}

export function invoiceGrandTotal(invoice: Invoice): number {
  return invoiceTotal(invoice.items, invoice.taxRate)
}

/** Round to 2 decimal places, avoiding floating point drift. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function formatMoney(amount: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount || 0)
}
