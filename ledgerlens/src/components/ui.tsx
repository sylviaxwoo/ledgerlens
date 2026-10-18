import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { X } from 'lucide-react'
import { cls, money } from '../lib/format'
import type { VoucherStatus } from '../data/types'
import { t } from '../i18n'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({
  title,
  extra,
  children,
  className,
  pad = true,
}: {
  title?: ReactNode
  extra?: ReactNode
  children: ReactNode
  className?: string
  pad?: boolean
}) {
  return (
    <section className={cls('rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]', className)}>
      {(title || extra) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {extra && <div className="flex items-center gap-2 text-xs text-slate-500">{extra}</div>}
        </header>
      )}
      <div className={cls(pad && 'p-5')}>{children}</div>
    </section>
  )
}

export function Kpi({
  label,
  value,
  delta,
  hint,
  tone,
  onClick,
  icon,
}: {
  label: string
  value: ReactNode
  delta?: number
  hint?: ReactNode
  tone?: 'profit' | 'loss' | 'navy'
  onClick?: () => void
  icon?: ReactNode
}) {
  return (
    <div
      onClick={onClick}
      className={cls(
        'group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        onClick && 'cursor-pointer transition hover:border-navy/40 hover:shadow-md',
      )}
    >
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{label}</span>
        {icon && <span className="text-navy/60">{icon}</span>}
      </div>
      <div
        className={cls(
          'num mt-2 text-2xl font-semibold tracking-tight',
          tone === 'profit' ? 'text-profit' : tone === 'loss' ? 'text-loss' : 'text-ink',
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span className={cls('num font-medium', delta >= 0 ? 'text-profit' : 'text-loss')}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta * 100).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-slate-400">{hint}</span>}
      </div>
    </div>
  )
}

const BADGE: Record<string, string> = {
  navy: 'bg-navy-50 text-navy ring-navy/15',
  green: 'bg-profit-50 text-emerald-700 ring-profit/20',
  red: 'bg-loss-50 text-loss ring-loss/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-500/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-300/40',
}

export function Badge({ tone = 'slate', children }: { tone?: keyof typeof BADGE; children: ReactNode }) {
  return (
    <span className={cls('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', BADGE[tone])}>
      {children}
    </span>
  )
}

const STATUS_TONE: Record<VoucherStatus, keyof typeof BADGE> = {
  草稿: 'slate',
  待审核: 'amber',
  已审核: 'navy',
  已过账: 'green',
  已冲销: 'red',
}

export function StatusBadge({ status }: { status: VoucherStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{t(status)}</Badge>
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'success' | 'danger' | 'outline'; size?: 'sm' | 'md' }) {
  return (
    <button
      {...rest}
      className={cls(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm',
        variant === 'primary' && 'bg-navy text-white hover:bg-navy-700',
        variant === 'success' && 'bg-profit text-white hover:bg-emerald-600',
        variant === 'danger' && 'bg-loss text-white hover:bg-red-700',
        variant === 'outline' && 'border border-slate-300 bg-white text-ink hover:border-navy/50 hover:text-navy',
        variant === 'ghost' && 'text-navy hover:bg-navy-50',
        className,
      )}
    />
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: ReactNode }[]; value: T; onChange: (k: T) => void }) {
  return (
    <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cls(
            'rounded-md px-3.5 py-1.5 text-sm font-medium transition',
            value === tab.key ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:text-navy',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function Money({ v, signed, className }: { v: number; signed?: boolean; className?: string }) {
  return (
    <span className={cls('num', v < 0 && 'text-loss', signed && v > 0 && 'text-profit', className)}>
      {signed && v > 0 ? '+' : ''}
      {money(v)}
    </span>
  )
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cls('overflow-x-auto', className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function Th({ children, right, className }: { children?: ReactNode; right?: boolean; className?: string }) {
  return (
    <th
      className={cls(
        'whitespace-nowrap border-b border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-semibold text-slate-500',
        right ? 'text-right' : 'text-left',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({ children, right, className, onClick, colSpan }: { children?: ReactNode; right?: boolean; className?: string; onClick?: () => void; colSpan?: number }) {
  return (
    <td onClick={onClick} colSpan={colSpan} className={cls('whitespace-nowrap border-b border-slate-100 px-3 py-2.5', right && 'num text-right', className)}>
      {children}
    </td>
  )
}

export function Drawer({ open, onClose, title, children, width = 'max-w-3xl' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className={cls('relative flex h-full w-full flex-col bg-canvas shadow-2xl', width)}>
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="text-base font-semibold text-ink">{title}</div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

export function LinkText({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="font-medium text-navy underline-offset-2 hover:underline">
      {children}
    </button>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-10 text-center text-sm text-slate-400">{children}</div>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-ink">{children}</div>
    </div>
  )
}

export const selectCls =
  'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/15'

export const CHART = {
  navy: '#1E3A5F',
  navyLight: '#5B7BA6',
  navyPale: '#A9BCD6',
  profit: '#10B981',
  loss: '#DC2626',
  amber: '#F59E0B',
  slate: '#94A3B8',
  grid: '#E2E8F0',
}

export const BU_COLORS: Record<string, string> = {
  'BU-B2C': '#1E3A5F',
  'BU-B2B': '#5B7BA6',
  'BU-RTN': '#94A3B8',
  'BU-LATAM': '#10B981',
}
