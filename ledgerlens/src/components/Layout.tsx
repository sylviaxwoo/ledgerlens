import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  LayoutDashboard,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Target,
  Wallet,
  XCircle,
} from 'lucide-react'
import { ROLES, useStore } from '../store'
import { entities, entityName, OPEN_PERIOD } from '../data/master'
import { cls } from '../lib/format'
import { t, type Lang } from '../i18n'
import { selectCls } from './ui'

const NAV = [
  {
    group: '业财看板',
    items: [
      { to: '/', label: '集团总览', icon: LayoutDashboard },
      { to: '/roi', label: '项目 ROI 回溯', icon: Target },
      { to: '/quality', label: '数据质量', icon: ShieldCheck },
    ],
  },
  {
    group: '业务单据',
    items: [{ to: '/orders', label: '订单中心', icon: ShoppingCart }],
  },
  {
    group: '财务核算',
    items: [
      { to: '/vouchers', label: '凭证管理', icon: FileSpreadsheet },
      { to: '/ledger', label: '总账与报表', icon: BookOpen },
      { to: '/ar', label: '应收账款', icon: Wallet },
      { to: '/ap', label: '应付账款', icon: Receipt },
    ],
  },
  {
    group: '系统',
    items: [{ to: '/settings', label: '基础配置', icon: Settings }],
  },
]

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8">
        <rect width="32" height="32" rx="7" fill="#10B981" fillOpacity="0.16" />
        <circle cx="14" cy="14" r="6.5" fill="none" stroke="#F8FAFC" strokeWidth="2.5" />
        <path d="M19 19l5.5 5.5" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
        <path d="M11 15.5l2-2 1.5 1.5 3-3" fill="none" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <div className="text-[15px] font-semibold tracking-tight text-white">LedgerLens</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">{t('镜账 · 业财一体')}</div>
      </div>
    </div>
  )
}

export default function Layout() {
  const { role, setRole, exceptions, toasts, periodClosed, lang, setLang } = useStore()
  const nav = useNavigate()
  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col bg-navy">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">{t(g.group)}</div>
              {g.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cls(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition',
                      isActive ? 'bg-white/12 font-medium text-white shadow-inner' : 'text-white/70 hover:bg-white/6 hover:text-white',
                    )
                  }
                >
                  <Icon size={17} />
                  <span className="flex-1">{t(label)}</span>
                  {to === '/vouchers' && exceptions.length > 0 && (
                    <span className="rounded-full bg-loss px-1.5 text-[10px] font-semibold text-white">{exceptions.length}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="m-3 rounded-lg bg-white/6 p-3 text-xs text-white/60">
          <div className="flex items-center gap-1.5 font-medium text-white/80">
            <BarChart3 size={14} /> {t('数据口径')}
          </div>
          <p className="mt-1 leading-relaxed">{t('看板数据来自已过账凭证与业务单据，过账后 15 分钟内刷新。')}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-6">
          <select className={selectCls} defaultValue="CN01">
            {entities.map((e) => (
              <option key={e.code} value={e.code}>{e.code} · {entityName(e.code)}</option>
            ))}
            <option value="ALL">{t('集团汇总视图')}</option>
          </select>
          <span
            className={cls(
              'rounded-md px-2.5 py-1 text-xs font-medium',
              periodClosed ? 'bg-slate-100 text-slate-600' : 'bg-profit-50 text-emerald-700',
            )}
          >
            {t('期间')} {OPEN_PERIOD} · {periodClosed ? t('已结账') : t('开放')}
          </span>
          <select className={selectCls} defaultValue="CNY">
            <option value="CNY">{t('本位币 CNY')}</option>
            <option value="ORIG">{t('原币')}</option>
          </select>
          <div className="flex-1" />
          <button
            onClick={() => nav('/vouchers?tab=exceptions')}
            className={cls(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
              exceptions.length ? 'bg-loss-50 text-loss' : 'bg-slate-100 text-slate-500',
            )}
          >
            <AlertTriangle size={14} /> {t('异常队列')} {exceptions.length}
          </button>
          <select className={selectCls} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="es" disabled>Español (próximamente)</option>
          </select>
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">{role.name.slice(0, 1)}</div>
            <select
              className="bg-transparent text-sm font-medium text-ink outline-none"
              value={role.name}
              onChange={(e) => setRole(ROLES.find((r) => r.name === e.target.value)!)}
            >
              {ROLES.map((r) => (
                <option key={r.name} value={r.name}>{r.name} · {t(r.title)}</option>
              ))}
            </select>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-7">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>

      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-96 flex-col gap-2">
        {toasts.map((x) => (
          <div
            key={x.id}
            className={cls(
              'pointer-events-auto flex items-start gap-2 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg',
              x.tone === 'ok' && 'border-profit/30',
              x.tone === 'err' && 'border-loss/30',
              x.tone === 'warn' && 'border-amber-400/40',
              x.tone === 'info' && 'border-navy/20',
            )}
          >
            {x.tone === 'ok' && <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-profit" />}
            {x.tone === 'err' && <XCircle size={17} className="mt-0.5 shrink-0 text-loss" />}
            {x.tone === 'warn' && <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-500" />}
            {x.tone === 'info' && <Info size={17} className="mt-0.5 shrink-0 text-navy" />}
            <span className="text-ink">{x.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
