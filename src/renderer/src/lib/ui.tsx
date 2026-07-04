import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-500 disabled:bg-brand-800/50',
  secondary: 'bg-slate-700/70 text-slate-100 hover:bg-slate-700',
  ghost: 'bg-transparent text-slate-300 hover:bg-white/10',
  danger: 'bg-red-600 text-white hover:bg-red-500'
}

export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  )
}

const fieldClass =
  'selectable rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 placeholder:text-slate-500'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClass} resize-none ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClass} ${props.className ?? ''}`} />
}

export function Badge({
  children,
  color = 'slate'
}: {
  children: ReactNode
  color?: 'slate' | 'green' | 'blue' | 'amber' | 'red' | 'violet'
}) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-600/40 text-slate-300',
    green: 'bg-emerald-500/20 text-emerald-300',
    blue: 'bg-sky-500/20 text-sky-300',
    amber: 'bg-amber-500/20 text-amber-300',
    red: 'bg-red-500/20 text-red-300',
    violet: 'bg-violet-500/20 text-violet-300'
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${colors[color]}`}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
  action
}: {
  icon?: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      {icon && <div className="text-slate-600">{icon}</div>}
      <div>
        <p className="text-sm font-medium text-slate-300">{title}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6"
      onPointerDown={onClose}
    >
      <div
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-window ${
          wide ? 'max-w-2xl' : 'max-w-md'
        }`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
          >
            Esc
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
