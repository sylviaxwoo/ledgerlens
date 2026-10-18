import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BellRing, Wand2 } from 'lucide-react'
import { Badge, Button, Card, CHART, Kpi, Money, PageHeader, Table, Td, Th } from '../components/ui'
import { useStore } from '../store'
import { buName, customerName, customers, projectName, TODAY } from '../data/master'
import { axisWan, cls, daysBetween, money, pct, sum, wan } from '../lib/format'
import { getLang, t } from '../i18n'

const MONTHLY_CREDIT_SALES = 1_150_000_00

const BUCKETS = [
  { k: '0-30 天', min: 0, max: 30, rate: 0.01, color: CHART.navy },
  { k: '31-60 天', min: 31, max: 60, rate: 0.05, color: CHART.navyLight },
  { k: '61-90 天', min: 61, max: 90, rate: 0.2, color: CHART.amber },
  { k: '90 天以上', min: 91, max: 99999, rate: 0.5, color: CHART.loss },
]

export default function Receivables() {
  const { arItems, receipts, autoMatchReceipts, toast } = useStore()
  const open = arItems.map((a) => ({ ...a, open: a.amount - a.settled, age: daysBetween(a.date, TODAY), overdue: Math.max(0, daysBetween(a.due, TODAY)) }))
  const totalOpen = sum(open, (a) => a.open)
  const overdueAmt = sum(open.filter((a) => a.overdue > 0), (a) => a.open)
  const prepaid = sum(receipts, (r) => r.prepaid ?? 0)
  const received = sum(receipts.filter((r) => r.matched), (r) => r.amount)
  const dso = Math.round((totalOpen / MONTHLY_CREDIT_SALES) * 30)

  const bucketOf = (age: number) => BUCKETS.find((b) => age >= b.min && age <= b.max)!
  const custs = [...new Set(open.map((a) => a.customer))]
  const aging = custs.map((c) => {
    const row: Record<string, string | number> = { name: customerName(c).slice(0, getLang() === 'zh' ? 8 : 16) }
    for (const b of BUCKETS) row[b.k] = sum(open.filter((a) => a.customer === c && bucketOf(a.age) === b), (a) => a.open)
    return row
  })
  const provision = BUCKETS.map((b) => {
    const amt = sum(open.filter((a) => bucketOf(a.age) === b), (a) => a.open)
    return { ...b, amt, prov: Math.round(amt * b.rate) }
  })

  return (
    <div>
      <PageHeader title={t('应收账款')} subtitle={t('应收台账、收款核销、账龄分析、信用管理与坏账计提')} actions={<Button onClick={autoMatchReceipts}><Wand2 size={15} />  {t('银行流水自动核销')}</Button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label={t('应收余额')} value={wan(totalOpen, 2)} hint={t('{n} 笔未核销', { n: open.filter((a) => a.open > 0).length })} />
        <Kpi label={t('逾期金额')} value={wan(overdueAmt, 2)} tone="loss" hint={t('逾期率 {v}', { v: pct(overdueAmt / totalOpen) })} />
        <Kpi label="DSO" value={t('{n} 天', { n: dso })} hint={t('应收周转天数')} />
        <Kpi label={t('本期已核销回款')} value={wan(received, 2)} tone="profit" />
        <Kpi label={t('预收账款')} value={wan(prepaid, 2)} hint={t('回款超出应收部分')} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title={t('账龄分析（按客户 / 平台）')} className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={aging} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={axisWan} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => money(Number(v), true)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {BUCKETS.map((b) => <Bar key={b.k} dataKey={b.k} name={t(b.k)} stackId="a" fill={b.color} maxBarSize={40} />)}
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title={t('坏账准备（按账龄计提）')} pad={false}>
          <Table>
            <thead><tr><Th>{t('账龄')}</Th><Th right>{t('余额')}</Th><Th right>{t('比例')}</Th><Th right>{t('计提')}</Th></tr></thead>
            <tbody>
              {provision.map((p) => (
                <tr key={p.k}>
                  <Td><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />{t(p.k)}</span></Td>
                  <Td right>{money(p.amt)}</Td>
                  <Td right>{pct(p.rate, 0)}</Td>
                  <Td right className="text-loss">{money(p.prov)}</Td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <Td>{t('合计')}</Td><Td right>{money(totalOpen)}</Td><Td /><Td right className="text-loss">{money(sum(provision, (p) => p.prov))}</Td>
              </tr>
            </tbody>
          </Table>
        </Card>
      </div>

      <Card title={t('应收台账')} pad={false} className="mt-5">
        <Table>
          <thead>
            <tr><Th>{t('编号')}</Th><Th>{t('客户 / 平台')}</Th><Th>{t('来源单据')}</Th><Th>BU</Th><Th>{t('项目')}</Th><Th>{t('开票日')}</Th><Th>{t('到期日')}</Th><Th right>{t('应收金额')}</Th><Th right>{t('已核销')}</Th><Th right>{t('未核销余额')}</Th><Th>{t('账龄')}</Th><Th>{t('逾期')}</Th></tr>
          </thead>
          <tbody>
            {open.map((a) => (
              <tr key={a.id}>
                <Td className="text-slate-500">{a.id}</Td>
                <Td className="font-medium">{customerName(a.customer)}</Td>
                <Td className="text-slate-600">{t(a.doc)}</Td>
                <Td>{buName(a.bu)}</Td>
                <Td className="text-slate-500">{a.project ? projectName(a.project) : '—'}</Td>
                <Td className="text-slate-500">{a.date}</Td>
                <Td className="text-slate-500">{a.due}</Td>
                <Td right><Money v={a.amount} /></Td>
                <Td right className="text-profit">{a.settled ? money(a.settled) : '—'}</Td>
                <Td right className="font-semibold">{a.open ? money(a.open) : <Badge tone="green">{t('已结清')}</Badge>}</Td>
                <Td><Badge tone={a.age > 90 ? 'red' : a.age > 60 ? 'amber' : 'slate'}>{t(bucketOf(a.age).k)}</Badge></Td>
                <Td>{a.open && a.overdue ? <span className="num text-xs font-medium text-loss">{t('{n} 天', { n: a.overdue })}</span> : <span className="text-xs text-slate-400">—</span>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title={t('银行流水与核销结果（一对多 / 剩余转预收）')} pad={false}>
          <Table>
            <thead><tr><Th>{t('流水号')}</Th><Th>{t('日期')}</Th><Th>{t('付款方')}</Th><Th right>{t('金额')}</Th><Th>{t('核销明细')}</Th></tr></thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id}>
                  <Td className="text-slate-500">{r.id}</Td>
                  <Td className="text-slate-500">{r.date}</Td>
                  <Td>{t(r.payer)}<div className="text-xs text-slate-400">{t(r.ref)}</div></Td>
                  <Td right><Money v={r.amount} /></Td>
                  <Td className="whitespace-normal">
                    {r.matched ? (
                      <div className="space-y-0.5 text-xs">
                        {r.matched.map((m) => <div key={m.arId}><Badge tone="green">{m.arId}</Badge> <span className="num">{money(m.amount)}</span></div>)}
                        {r.prepaid && <div><Badge tone="navy">{t('转预收')}</Badge> <span className="num">{money(r.prepaid)}</span></div>}
                      </div>
                    ) : customers.some((c) => c.name === r.payer) ? (
                      <Badge tone="amber">{t('待核销')}</Badge>
                    ) : (
                      <Badge tone="red">{t('无法识别，需人工')}</Badge>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card title={t('信用管理')} pad={false}>
          <Table>
            <thead><tr><Th>{t('客户')}</Th><Th right>{t('信用额度')}</Th><Th>{t('占用')}</Th><Th>{t('账期')}</Th><Th>{t('状态')}</Th><Th /></tr></thead>
            <tbody>
              {customers.filter((c) => c.type === 'B2B 企业').map((c) => {
                const used = sum(open.filter((a) => a.customer === c.code), (a) => a.open)
                const over = sum(open.filter((a) => a.customer === c.code && a.overdue > 0 && a.open), (a) => a.open)
                const u = used / c.creditLimit
                return (
                  <tr key={c.code}>
                    <Td className="font-medium">{t(c.name)}</Td>
                    <Td right>{wan(c.creditLimit)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className={cls('h-full', u > 0.9 ? 'bg-loss' : u > 0.7 ? 'bg-amber-500' : 'bg-navy')} style={{ width: `${Math.min(100, u * 100)}%` }} /></div>
                        <span className="num text-xs text-slate-500">{pct(u, 0)}</span>
                      </div>
                    </Td>
                    <Td className="text-slate-500">{t('{n} 天', { n: c.termDays })}</Td>
                    <Td>{c.status === '冻结' ? <Badge tone="red">{t('逾期冻结')}</Badge> : over ? <Badge tone="amber">{t('有逾期')}</Badge> : <Badge tone="green">{t('正常')}</Badge>}</Td>
                    <Td>{over > 0 && <Button size="sm" variant="ghost" onClick={() => toast('ok', t('已向 {name} 发送催收提醒（逾期 {amt}），并记录催收节点', { name: t(c.name), amt: money(over, true) }))}><BellRing size={12} />  {t('催收')}</Button>}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
