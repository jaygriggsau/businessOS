import type { DashboardStats } from '@shared/types'
import { invoiceTotal, round2 } from '@shared/money'
import { getDb } from './index'
import { listInvoices } from './invoices'

export function getDashboardStats(): DashboardStats {
  const db = getDb()

  const contactCount = (
    db.prepare('SELECT COUNT(*) AS n FROM contacts').get() as { n: number }
  ).n
  const customerCount = (
    db.prepare("SELECT COUNT(*) AS n FROM contacts WHERE status = 'customer'").get() as {
      n: number
    }
  ).n
  const leadCount = (
    db.prepare("SELECT COUNT(*) AS n FROM contacts WHERE status = 'lead'").get() as {
      n: number
    }
  ).n

  const invoices = listInvoices()
  let outstandingTotal = 0
  let paidTotal = 0
  for (const inv of invoices) {
    const total = invoiceTotal(inv.items, inv.taxRate)
    if (inv.status === 'paid') paidTotal += total
    else if (inv.status === 'sent' || inv.status === 'overdue') outstandingTotal += total
  }

  return {
    contactCount,
    customerCount,
    leadCount,
    invoiceCount: invoices.length,
    outstandingTotal: round2(outstandingTotal),
    paidTotal: round2(paidTotal)
  }
}
