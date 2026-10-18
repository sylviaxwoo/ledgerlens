import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowUpRight, Banknote, Coins, Landmark, TrendingUp, Wallet } from 'lucide-react'
import { BU_COLORS, Badge, Card, CHART, Kpi, PageHeader, Table, Td, Th, selectCls } from '../components/ui'
import { buMonthly, cashSeries, MONTHS, projectMonthly, shortMonth, investTotal } from '../data/series'
import { buName, bus, projects } from '../data/master'
import { useStore } from '../store'
import { axisWan, cls, money, pct, sum, wan } from '../lib/format'
import { t } from '../i18n'

const BU_LIST = bus.filter((b) => b.code !== 'GRP')
const CUR = MONTHS[MONTHS.length - 1]
const PREV = MONTHS[MONTHS.length - 2]

type Agg = ReturnType<typeof aggregate>
function aggregate(rows: typeof buMonthly) {
  const f = (k: keyof (typeof buMonthly)[number]) => sum(rows, (r) => r[k] as number)
  return {
    revenue: f('revenue'),
    gmv: f('gmv'),
    cogs: f('cogs'),
    platformFee: f('platformFee'),
    logistics: f('logistics'),
    ads: f('ads'),
    returnLoss: f('returnLoss'),
    gross: f('gross'),
    contribution: f('contribution'),
    budgetRevenue: f('budgetRevenue'),
  }
}

const axisTick = { fontSize: 11, fill: '#64748B' }
const tipStyle = { borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }
const fmtWan = axisWan

export default function Dashboard() {
  const [bu, setBu] = useState<string>('ALL')
  const { arItems, apItems } = useStore()
  const nav = useNavigate()

  const scoped = useMemo(() => (bu === 'ALL' ? buMonthly : buMonthly.filter((r) => r.bu === bu)), [bu])
  const cur = aggregate(scoped.filter((r) => r.month === CUR))
  const prev = aggregate(scoped.filter((r) => r.month === PREV))
  const ytd = aggregate(scoped.filter((r) => r.month >= '2026-01'))
  const delta = (a: number, b: number) => (b ? (a - b) / Math.abs(b) : 0)

  const trend = MONTHS.map((m) => {
    const rows = scoped.filter((r) => r.month === m)
    const row: Record<string, number | string> = { month: shortMonth(m) }
    for (const b of BU_LIST) row[b.code] = sum(rows.filter((r) => r.bu === b.code), (r) => r.revenue)
    row.contribution = sum(rows, (r) => r.contribution)
    row.margin = sum(rows, (r) => r.contribution) / Math.max(1, sum(rows, (r) => r.revenue))
    return row
  })

  const waterfall = buildWaterfall(cur)

  const arOpen = sum(arItems, (a) => a.amount - a.settled)
  const apOpen = sum(apItems, (a) => a.invoice - a.paid)
  const cash = cashSeries[cashSeries.length - 1]

  const buRows = BU_LIST.map((b) => {
    const c = aggregate(buMonthly.filter((r) => r.bu === b.code && r.month === CUR))
    const p = aggregate(buMonthly.filter((r) => r.bu === b.code && r.month === PREV))
    return { b, c, p }
  })

  const costMix = [
    { name: t('销售成本'), value: cur.cogs, color: CHART.navy },
    { name: t('平台费用'), value: cur.platformFee, color: CHART.navyLight },
    { name: t('物流履约'), value: cur.logistics, color: CHART.navyPale },
    { name: t('广告投放'), value: cur.ads, color: CHART.amber },
    { name: t('退货损失'), value: cur.returnLoss, color: CHART.loss },
  ]

  const reconcile = [
    { k: t('业务口径 GMV（订单金额）'), v: cur.gmv },
    { k: t('减：已发货未签收（按签收确认收入的 BU）'), v: -Math.round(cur.gmv * 0.041) },
    { k: t('减：退货红冲收入'), v: -Math.round(cur.gmv * 0.028) },
    { k: t('减：平台促销补贴（冲减收入）'), v: -Math.round(cur.gmv * 0.019) },
    { k: t('减：含税金额中的销项税 / VAT'), v: -Math.round(cur.gmv * 0.0173) },
  ]
  const reconciled = sum(reconcile, (r) => r.v)
  const fxDiff = cur.revenue - reconciled
  const projectTop = projects
    .map((p) => {
      const rows = projectMonthly[p.code]
      const ci = sum(rows, (r) => investTotal(r.invest))
      const cc = sum(rows, (r) => r.contribution)
      return { p, roi: (cc - ci) / ci }
    })
    .sort((a, b) => b.roi - a.roi)

  return (
    <div>
      <PageHeader
        title={bu === 'ALL' ? t('集团总览') : t('BU 视图 · {name}', { name: buName(bu) })}
        subtitle={t('{period} 期间 · 本位币 CNY · 数据截至 2026-10-18 09:15（过账后 15 分钟内刷新）', { period: CUR })}
        actions={
          <>
            <select className={selectCls} value={bu} onChange={(e) => setBu(e.target.value)}>
              <option value="ALL">{t('全部业务单元')}</option>
              {BU_LIST.map((b) => (
                <option key={b.code} value={b.code}>{t(b.name)}</option>
              ))}
            </select>
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-ink hover:border-navy">{t('导出 Excel')}</button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t('本月净销售额')} value={wan(cur.revenue)} delta={delta(cur.revenue, prev.revenue)} hint={t('环比')} icon={<TrendingUp size={15} />} />
        <Kpi label={t('毛利率')} value={pct(cur.gross / cur.revenue)} delta={delta(cur.gross / cur.revenue, prev.gross / prev.revenue)} hint={t('毛利 {v}', { v: wan(cur.gross) })} icon={<Coins size={15} />} />
        <Kpi label={t('贡献利润')} value={wan(cur.contribution)} tone={cur.contribution >= 0 ? 'profit' : 'loss'} delta={delta(cur.contribution, prev.contribution)} hint={t('率 {v}', { v: pct(cur.contribution / cur.revenue) })} icon={<Banknote size={15} />} />
        <Kpi label={t('预算完成率（收入）')} value={pct(cur.revenue / cur.budgetRevenue)} tone={cur.revenue >= cur.budgetRevenue ? 'profit' : 'loss'} hint={t('预算 {v}', { v: wan(cur.budgetRevenue) })} />
        <Kpi label={t('现金余额')} value={wan(cash.balance)} hint={t('净流入 {v}', { v: wan(cash.inflow - cash.outflow) })} icon={<Landmark size={15} />} />
        <Kpi label={t('应收 / 应付余额')} value={<span className="text-xl">{wan(arOpen)} / {wan(apOpen)}</span>} hint={t('点击查看账龄')} onClick={() => nav('/ar')} icon={<Wallet size={15} />} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title={t('收入结构与贡献利润趋势（近 12 个月）')} className="xl:col-span-2" extra={<span>{t('YTD 收入 {r} · 贡献利润 {c}', { r: wan(ytd.revenue), c: wan(ytd.contribution) })}</span>}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtWan} />
              <YAxis yAxisId="r" orientation="right" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip contentStyle={tipStyle} formatter={(v, n) => (n === t('贡献利润率') ? pct(Number(v)) : wan(Number(v)))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {BU_LIST.filter((b) => bu === 'ALL' || b.code === bu).map((b) => (
                <Bar key={b.code} yAxisId="l" dataKey={b.code} name={t(b.name)} stackId="rev" fill={BU_COLORS[b.code]} maxBarSize={34} />
              ))}
              <Line yAxisId="r" dataKey="margin" name={t('贡献利润率')} stroke={CHART.profit} strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title={t('本月成本费用结构')}>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={costMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {costMix.map((c) => (
                  <Cell key={c.name} fill={c.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tipStyle} formatter={(v) => wan(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {costMix.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />{c.name}</span>
                <span className="num text-ink">{wan(c.value)} <span className="text-xs text-slate-400">{pct(c.value / cur.revenue)}</span></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title={t('贡献利润瀑布（本月）')} className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={waterfall} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtWan} />
              <Tooltip contentStyle={tipStyle} formatter={(v, n) => (n === 'base' ? null : wan(Number(v)))} />
              <Bar dataKey="base" stackId="w" fill="transparent" />
              <Bar dataKey="value" stackId="w" maxBarSize={56} radius={[4, 4, 0, 0]}>
                {waterfall.map((w) => (
                  <Cell key={w.name} fill={w.kind === 'total' ? CHART.navy : w.kind === 'result' ? CHART.profit : CHART.loss} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title={t('业务口径 vs 账面口径收入')} extra={<Badge tone="navy">{t('口径对账')}</Badge>}>
          <div className="space-y-2 text-sm">
            {reconcile.map((r) => (
              <div key={r.k} className="flex justify-between gap-3">
                <span className="text-slate-600">{r.k}</span>
                <span className={cls('num', r.v < 0 ? 'text-loss' : 'text-ink')}>{wan(r.v, 2)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-3">
              <span className="text-slate-600">{t('汇率折算差异（期末汇率 vs 交易日汇率）')}</span>
              <span className={cls('num', fxDiff < 0 ? 'text-loss' : 'text-ink')}>{wan(fxDiff, 2)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold">
              <span>{t('账面主营业务收入')}</span>
              <span className="num">{wan(cur.revenue, 2)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title={t('业务单元对比（本月，点击进入 BU 视图）')} className="xl:col-span-2" pad={false}>
          <Table>
            <thead>
              <tr>
                <Th>{t('业务单元')}</Th>
                <Th right>{t('净销售额')}</Th>
                <Th right>{t('环比')}</Th>
                <Th right>{t('毛利率')}</Th>
                <Th right>{t('平台费率')}</Th>
                <Th right>{t('退货损失')}</Th>
                <Th right>{t('贡献利润')}</Th>
                <Th right>{t('预算完成')}</Th>
              </tr>
            </thead>
            <tbody>
              {buRows.map(({ b, c, p }) => (
                <tr key={b.code} className={cls('cursor-pointer hover:bg-navy-50/50', bu === b.code && 'bg-navy-50')} onClick={() => setBu(bu === b.code ? 'ALL' : b.code)}>
                  <Td>
                    <span className="flex items-center gap-2 font-medium"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: BU_COLORS[b.code] }} />{t(b.name)}</span>
                  </Td>
                  <Td right>{wan(c.revenue)}</Td>
                  <Td right className={c.revenue >= p.revenue ? 'text-profit' : 'text-loss'}>{pct(delta(c.revenue, p.revenue))}</Td>
                  <Td right>{pct(c.gross / c.revenue)}</Td>
                  <Td right>{pct(c.platformFee / c.revenue)}</Td>
                  <Td right className="text-loss">{wan(c.returnLoss)}</Td>
                  <Td right className={c.contribution >= 0 ? 'font-semibold text-profit' : 'font-semibold text-loss'}>{wan(c.contribution)}</Td>
                  <Td right>{pct(c.revenue / c.budgetRevenue)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card title={t('项目 ROI 排行')} extra={<button onClick={() => nav('/roi')} className="inline-flex items-center gap-0.5 text-navy hover:underline">{t('回溯')} <ArrowUpRight size={13} /></button>}>
          <div className="space-y-3">
            {projectTop.map(({ p, roi }) => (
              <button key={p.code} onClick={() => nav(`/roi?p=${p.code}`)} className="block w-full text-left">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{t(p.name)}</span>
                  <span className={cls('num font-semibold', roi >= 0 ? 'text-profit' : 'text-loss')}>{pct(roi)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={cls('h-full rounded-full', roi >= 0 ? 'bg-profit' : 'bg-loss')} style={{ width: `${Math.min(100, Math.abs(roi) * 100)}%` }} />
                </div>
                <div className="mt-1 text-xs text-slate-400">{buName(p.bu)} · {t(p.type)} · {t("负责人")} {t(p.owner)}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card title={t('现金流趋势（回款 vs 付款）')} className="mt-5">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={cashSeries.map((c) => ({ ...c, month: shortMonth(c.month), outflow: -c.outflow }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtWan} />
            <Tooltip contentStyle={tipStyle} formatter={(v) => money(Math.abs(Number(v)), true)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="inflow" name={t('回款流入')} fill={CHART.profit} maxBarSize={22} radius={[3, 3, 0, 0]} />
            <Bar dataKey="outflow" name={t('付款流出')} fill={CHART.loss} fillOpacity={0.85} maxBarSize={22} radius={[0, 0, 3, 3]} />
            <Line dataKey="balance" name={t('现金余额')} stroke={CHART.navy} strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

type WaterfallStep = { name: string; base: number; value: number; kind: 'total' | 'neg' | 'result' }

function buildWaterfall(a: Agg): WaterfallStep[] {
  const costs: [string, number][] = [
    [t('销售成本'), a.cogs],
    [t('平台费用'), a.platformFee],
    [t('物流履约'), a.logistics],
    [t('广告投放'), a.ads],
    [t('退货损失'), a.returnLoss],
  ]
  let run = a.revenue
  const out: WaterfallStep[] = [{ name: t('净销售额'), base: 0, value: a.revenue, kind: 'total' }]
  for (const [name, v] of costs) {
    run -= v
    out.push({ name, base: run, value: v, kind: 'neg' })
  }
  out.push({ name: t('贡献利润'), base: 0, value: run, kind: 'result' })
  return out
}
