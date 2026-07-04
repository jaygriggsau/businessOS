import type { ComponentType, SVGProps } from 'react'
import DashboardApp from '../apps/dashboard/DashboardApp'
import CrmApp from '../apps/crm/CrmApp'
import InvoiceApp from '../apps/invoice/InvoiceApp'
import SocialApp from '../apps/social/SocialApp'
import SettingsApp from '../apps/settings/SettingsApp'
import { CrmIcon, DashboardIcon, InvoiceIcon, SettingsIcon, SocialIcon } from './icons'

export interface AppDefinition {
  id: string
  name: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Tailwind gradient classes for the app tile / dock icon. */
  accent: string
  component: ComponentType
  /** Only ever allow a single window of this app. */
  singleton?: boolean
  defaultSize?: { width: number; height: number }
}

export const APPS: AppDefinition[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Your business at a glance',
    icon: DashboardIcon,
    accent: 'from-sky-500 to-blue-600',
    component: DashboardApp,
    singleton: true
  },
  {
    id: 'crm',
    name: 'CRM',
    description: 'Contacts, leads & customers',
    icon: CrmIcon,
    accent: 'from-violet-500 to-indigo-600',
    component: CrmApp,
    singleton: true
  },
  {
    id: 'invoice',
    name: 'Invoicing',
    description: 'Create & track invoices',
    icon: InvoiceIcon,
    accent: 'from-emerald-500 to-teal-600',
    component: InvoiceApp,
    singleton: true
  },
  {
    id: 'social',
    name: 'Social Studio',
    description: 'AI posts, hashtags & images',
    icon: SocialIcon,
    accent: 'from-pink-500 to-rose-600',
    component: SocialApp,
    singleton: true
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'App & data settings',
    icon: SettingsIcon,
    accent: 'from-slate-500 to-slate-700',
    component: SettingsApp,
    singleton: true
  }
]

export const APP_MAP: Record<string, AppDefinition> = Object.fromEntries(
  APPS.map((a) => [a.id, a])
)

export function getApp(id: string): AppDefinition | undefined {
  return APP_MAP[id]
}
