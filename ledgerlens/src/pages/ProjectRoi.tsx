import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronDown, ChevronRight, Lock, Sigma } from 'lucide-react'
import { Badge, Card, CHART, Kpi, LinkText, Money, PageHeader, StatusBadge, Table, Td, Th, selectCls } from '../components/ui'
import { INVEST_CATS, investTotal, projectMonthly, roiSnapshots, shortMonth, type InvestCat } from '../data/series'
import { accountName, accounts, buName, projects } from '../data/master'
import { useStore } from '../store'
import { useDrill } from '../components/Drill'
import { axisWan, cls, pct, sum, wan } from '../lib/format'
import { t } from '../i18n'

const ALLOC_V2_FACTOR: Record<string, number> = { 'PRJ-MX': 1.65, 'PRJ-WH': 0.7, 'PRJ-TT': 1.45, 'PRJ-ERP': 1 }
const PLAN_SHARE: Record<string, Partial<Record<InvestCat, number>>> = {
  'PRJ-MX': { 采购与物料: 0.3, 人力外包: 0.22, 广告投放: 0.2, 物流与仓储: 0.18, 分摊费用: 0.1 },
  'PRJ-WH': { 系统与设备折旧: 0.42, 物流与仓储: 0.36, 人力外包: 0.16, 分摊费用: 0.06 },
  'PRJ-TT': { 广告投放: 0.72, 人力外包: 0.14, 物流与仓储: 0.09, 分摊费用: 0.05 },
  'PRJ-ERP': { 人力外包: 0.84, 系统与设备折旧: 0.1, 分摊费用: 0.06 },
}

const axisTick = { fontSize: 11, fill: '#64748B' }
const tipStyle = { borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }
const fmtWan = axisWan

function monthsBetween(a: string, b: string) {
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5)) - Number(a.slice(5)) + 1
}

function computeSeries(code: string, rule: 'v1' | 'v2') {
  const rows = projectMonthly[code]
  let ci = 0
  let cc = 0
  let payback: string | null = null
  const out = rows.map((r, i) => {
    const isCurrent = i === rows.length - 1
    const invest = { ...r.invest }
    if (isCurrent && rule === 'v2') invest['分摊费用'] = Math.round(invest['分摊费用'] * ALLOC_V2_FACTOR[code])
    const it = investTotal(invest)
    ci += it
    cc += r.contribution
    if (!payback && cc >= ci) payback = r.month
    return { month: r.month, label: shortMonth(r.month), invest, monthInvest: it, monthContribution: r.contribution, revenue: r.revenue, gross: r.gross, cumInvest: ci, cumContribution: cc, roi: (cc - ci) / ci }
  })
  return { rows: out, payback: payback as string | null }
}

export default function ProjectRoi() {
  const [params, setParams] = useSearchParams()
  const code = params.get('p') ?? 'PRJ-MX'
  const [rule, setRule] = useState<'v1' | 'v2'>('v1')
  const p = projects.find((x) => x.code === code)!
  const { rows, payback } = useMemo(() => computeSeries(code, rule), [code, rule])
  const last = rows[rows.length - 1]
  const elapsed = rows.length
  const totalMonths = monthsBetween(p.start, p.end)
  const paybackIdx = payback ? rows.findIndex((r) => r.month === payback) + 1 : null

  const catActual = INVEST_CATS.map((c) => ({ cat: c, actual: sum(rows, (r) => r.invest[c]) })).filter((x) => x.actual > 0 || PLAN_SHARE[code][x.cat])
  const planCum = Math.round((p.budget * elapsed) / totalMonths)
  const deviation = catActual.map((x) => {
    const plan = Math.round(planCum * (PLAN_SHARE[code][x.cat] ?? 0))
    return { ...x, plan, diff: x.actual - plan }
  })

  const all = projects
    .map((x) => {
      const s = computeSeries(x.code, rule)
      const l = s.rows[s.rows.length - 1]
      return { code: x.code, name: t(x.name), type: x.type, roi: l.roi, plan: x.plannedRoi, payback: s.payback, cumInvest: l.cumInvest }
    })
    .sort((a, b) => b.roi - a.roi)

  const snaps = roiSnapshots.filter((s) => s.project === code)

  return (
    <div>
      <PageHeader
        title={t('项目 ROI 回溯')}
        subtitle={t('凭证行带「项目」辅助核算自动归集投入与产出；公共费用按分摊规则进入。ROI =（累计贡献利润 − 累计总投入）÷ 累计总投入')}
        actions={
          <>
            <select className={selectCls} value={rule} onChange={(e) => setRule(e.target.value as 'v1' | 'v2')}>
              <option value="v1">{t('分摊规则 ALLOC-v1 · 按收入')}</option>
              <option value="v2">{t('分摊规则 ALLOC-v2 · 按订单量')}</option>
            </select>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {all.map((x) => (
          <button
            key={x.code}
            onClick={() => setParams({ p: x.code })}
            className={cls(
              'rounded-xl border bg-white p-4 text-left transition',
              x.code === code ? 'border-navy ring-2 ring-navy/15' : 'border-slate-200 hover:border-navy/40',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{x.name}</span>
              <Badge tone="navy">{t(x.type)}</Badge>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <span className={cls('num text-2xl font-semibold', x.roi >= 0 ? 'text-profit' : 'text-loss')}>{pct(x.roi)}</span>
              <span className="text-xs text-slate-500">{x.payback ? t('已回本 · {m}', { m: x.payback }) : t('未回本')}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label={t('累计总投入')} value={wan(last.cumInvest)} hint={t('预算 {b} · 使用 {u}', { b: wan(p.budget), u: pct(last.cumInvest / p.budget) })} tone={last.cumInvest > planCum * 1.05 ? 'loss' : undefined} />
        <Kpi label={t('累计贡献利润（产出）')} value={wan(last.cumContribution)} tone="profit" hint={t('累计收入 {v}', { v: wan(sum(rows, (r) => r.revenue)) })} />
        <Kpi label={t('实际 ROI / 计划 ROI')} value={<span className={last.roi >= 0 ? 'text-profit' : 'text-loss'}>{pct(last.roi)}</span>} hint={t('计划 {v}', { v: pct(p.plannedRoi) })} />
        <Kpi
          label={t('实际 / 计划回收期')}
          value={paybackIdx ? t('{n} 个月', { n: paybackIdx }) : t('未回本')}
          tone={paybackIdx ? (paybackIdx <= p.plannedPaybackMonth ? 'profit' : 'loss') : 'loss'}
          hint={t('计划 {p} 个月 · 已运行 {e} 个月', { p: p.plannedPaybackMonth, e: elapsed })}
        />
        <Kpi label={t('项目信息')} value={<span className="text-base">{buName(p.bu)}</span>} hint={`${p.start} ~ ${p.end} · ${t(p.owner)}`} />
      </div>

      <Card
        title={t('时间轴：累计投入 vs 累计产出')}
        className="mt-5"
        extra={
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><i className="h-0.5 w-4 border-t-2 border-dashed border-amber-500" />{t('预算线')}</span>
            {payback && <span className="flex items-center gap-1"><i className="h-3 w-0.5 bg-profit" />{t('回本点')}</span>}
          </span>
        }
      >
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={rows} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis yAxisId="l" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtWan} />
            <YAxis yAxisId="r" orientation="right" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
            <Tooltip contentStyle={tipStyle} formatter={(v, n) => (n === 'ROI' ? pct(Number(v)) : wan(Number(v), 2))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area yAxisId="l" dataKey="cumInvest" name={t('累计投入')} fill={CHART.loss} fillOpacity={0.08} stroke={CHART.loss} strokeWidth={2} />
            <Area yAxisId="l" dataKey="cumContribution" name={t('累计贡献利润')} fill={CHART.profit} fillOpacity={0.12} stroke={CHART.profit} strokeWidth={2.5} />
            <Line yAxisId="r" dataKey="roi" name="ROI" stroke={CHART.navy} strokeWidth={2} dot={{ r: 3 }} />
            <ReferenceLine yAxisId="l" y={p.budget} stroke={CHART.amber} strokeDasharray="6 4" label={{ value: t('预算 {v}', { v: wan(p.budget) }), fill: CHART.amber, fontSize: 11, position: 'insideTopLeft' }} />
            {payback && <ReferenceLine yAxisId="l" x={shortMonth(payback)} stroke={CHART.profit} strokeWidth={2} label={{ value: t('回本点'), fill: CHART.profit, fontSize: 11, position: 'top' }} />}
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title={t('构成拆解：投入类别 计划 vs 实际（定位偏差来源）')} pad={false}>
          <Table>
            <thead>
              <tr><Th>{t('投入类别')}</Th><Th right>{t('计划累计')}</Th><Th right>{t('实际累计')}</Th><Th right>{t('偏差')}</Th><Th>{t('偏差率')}</Th></tr>
            </thead>
            <tbody>
              {deviation.map((d) => {
                const r = d.plan ? d.diff / d.plan : 0
                return (
                  <tr key={d.cat}>
                    <Td className="font-medium">{t(d.cat)}</Td>
                    <Td right>{wan(d.plan)}</Td>
                    <Td right>{wan(d.actual)}</Td>
                    <Td right className={d.diff > 0 ? 'text-loss' : 'text-profit'}>{d.diff > 0 ? '+' : ''}{wan(d.diff)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className={cls('h-full', d.diff > 0 ? 'bg-loss' : 'bg-profit')} style={{ width: `${Math.min(100, Math.abs(r) * 100)}%` }} />
                        </div>
                        <span className={cls('num text-xs', d.diff > 0 ? 'text-loss' : 'text-profit')}>{d.plan ? pct(r) : t('计划外')}</span>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
          <p className="px-5 py-3 text-xs text-slate-500">{t('计划累计 = 项目预算 × 已运行月数 / 项目总月数 × 类别计划占比。')}</p>
        </Card>

        <Card title={t('项目对比：同类项目按 ROI 排序')}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={all} layout="vertical" margin={{ top: 0, right: 24, left: 20, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" tick={axisTick} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={axisTick} width={130} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tipStyle} formatter={(v) => pct(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine x={0} stroke="#94A3B8" />
              <Bar dataKey="roi" name={t('实际 ROI')} maxBarSize={16} radius={[0, 4, 4, 0]}>
                {all.map((x) => <Cell key={x.code} fill={x.roi >= 0 ? CHART.profit : CHART.loss} />)}
              </Bar>
              <Bar dataKey="plan" name={t('计划 ROI')} fill={CHART.navyPale} maxBarSize={10} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title={<span className="flex items-center gap-1.5"><Lock size={14} />  {t('版本快照（月结后冻结，历史口径不被改写）')}</span>} pad={false}>
          <Table>
            <thead>
              <tr><Th>{t('期间')}</Th><Th>{t('结账日')}</Th><Th right>{t('累计投入')}</Th><Th right>{t('累计产出')}</Th><Th right>ROI</Th><Th>{t('分摊口径')}</Th></tr>
            </thead>
            <tbody>
              {snaps.map((s) => (
                <tr key={s.period}>
                  <Td>{s.period}</Td>
                  <Td className="text-slate-500">{s.closedAt}</Td>
                  <Td right>{wan(s.cumInvest)}</Td>
                  <Td right>{wan(s.cumContribution)}</Td>
                  <Td right className={s.roi >= 0 ? 'text-profit' : 'text-loss'}>{pct(s.roi)}</Td>
                  <Td><Badge>{t(s.ruleVersion)}</Badge></Td>
                </tr>
              ))}
              <tr className="bg-navy-50/50">
                <Td className="font-medium">{last.month}{t('（当前）')}</Td>
                <Td><Badge tone="green">{t('实时计算')}</Badge></Td>
                <Td right>{wan(last.cumInvest)}</Td>
                <Td right>{wan(last.cumContribution)}</Td>
                <Td right className={last.roi >= 0 ? 'font-semibold text-profit' : 'font-semibold text-loss'}>{pct(last.roi)}</Td>
                <Td><Badge tone="navy">{rule === 'v1' ? t('ALLOC-v1 按收入') : t('ALLOC-v2 按订单量')}</Badge></Td>
              </tr>
            </tbody>
          </Table>
          <p className="px-5 py-3 text-xs text-slate-500">{t('切换右上角分摊规则：只有当前期间按新规则重算，已结账期间的快照保持不变。')}</p>
        </Card>

        <DrillPanel code={code} />
      </div>
    </div>
  )
}

function DrillPanel({ code }: { code: string }) {
  const { vouchers } = useStore()
  const { openVoucher, openOrder } = useDrill()
  const [open, setOpen] = useState<string | null>(null)
  const lines = vouchers
    .filter((v) => v.status === '已过账' || v.status === '已冲销')
    .flatMap((v) => v.lines.filter((l) => l.aux.project === code).map((l) => ({ v, l })))
  const byAcc = Object.entries(
    lines.reduce<Record<string, typeof lines>>((m, x) => {
      ;(m[x.l.account] ??= []).push(x)
      return m
    }, {}),
  )

  return (
    <Card
      title={<span className="flex items-center gap-1.5"><Sigma size={14} />  {t('四级下钻：项目 → 科目 → 凭证 → 业务单据（2026-10 已过账）')}</span>}
      pad={false}
    >
      {byAcc.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">{t('本期暂无带该项目标签的已过账凭证行')}</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {byAcc.map(([acc, xs]) => {
            const sign = accounts.find((a) => a.code === acc)?.direction === '贷' ? -1 : 1
            const net = sign * sum(xs, (x) => x.l.debit - x.l.credit)
            return (
              <div key={acc}>
                <button onClick={() => setOpen(open === acc ? null : acc)} className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-slate-50">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {open === acc ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    {acc} {accountName(acc)}
                    <span className="text-xs font-normal text-slate-400">{t('{n} 行', { n: xs.length })}</span>
                  </span>
                  <Money v={net} className="text-sm font-semibold" />
                </button>
                {open === acc && (
                  <div className="bg-slate-50/60 px-5 pb-3">
                    <Table>
                      <tbody>
                        {xs.map(({ v, l }, i) => (
                          <tr key={i}>
                            <Td><LinkText onClick={() => openVoucher(v.id)}>{v.id}</LinkText></Td>
                            <Td><StatusBadge status={v.status} /></Td>
                            <Td className="text-slate-600">{t(l.memo)}</Td>
                            <Td>{v.sourceDoc.startsWith('SO-') || v.sourceDoc.startsWith('RT-') ? <LinkText onClick={() => openOrder(v.sourceDoc)}>{v.sourceDoc}</LinkText> : <span className="text-slate-500">{v.sourceDoc}</span>}</Td>
                            <Td right><Money v={sign * (l.debit - l.credit)} /></Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
