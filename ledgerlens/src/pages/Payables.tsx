import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge, Button, Card, CHART, Kpi, Money, PageHeader, Table, Td, Th } from '../components/ui'
import { useStore } from '../store'
import { buName, projectName, supplierName, suppliers, TODAY } from '../data/master'
import type { ApItem } from '../data/types'
import { axisWan, cls, daysBetween, money, pct, sum, wan } from '../lib/format'
import { t } from '../i18n'

const TOL = 0.005

const STATUS_TONE: Record<ApItem['status'], 'slate' | 'green' | 'red' | 'navy' | 'amber'> = {
  待匹配: 'slate',
  已匹配: 'green',
  匹配异常: 'red',
  已申请付款: 'navy',
  已付款: 'green',
}

function MatchCell({ base, v }: { base: number; v: number }) {
  const ok = Math.abs(v - base) / base <= TOL
  return (
    <span className={cls('num inline-flex items-center gap-1', !ok && 'font-semibold text-loss')}>
      {money(v)}
      {ok ? <CheckCircle2 size={13} className="text-profit" /> : <XCircle size={13} />}
    </span>
  )
}

export default function Payables() {
  const { apItems, runThreeWayMatch, approveApException, requestPayment } = useStore()
  const open = apItems.filter((a) => a.status !== '已付款')
  const openAmt = sum(open, (a) => a.invoice - a.paid)
  const plan = [30, 60, 90].map((d) => ({
    name: t('未来 {n} 天', { n: d }),
    ...Object.fromEntries(
      ['已匹配', '已申请付款', '匹配异常', '待匹配'].map((s) => [
        s,
        sum(
          open.filter((a) => {
            const x = daysBetween(TODAY, a.due)
            return a.status === s && x <= d && (d === 30 || x > d - 30)
          }),
          (a) => a.invoice - a.paid,
        ),
      ]),
    ),
  }))
  const dpo = 41

  return (
    <div>
      <PageHeader title={t('应付账款')} subtitle={t('采购订单 / 入库单 / 供应商发票三单匹配（容差 0.5%），不一致不允许进入付款申请')} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label={t('应付余额')} value={wan(openAmt, 2)} hint={t('{n} 笔', { n: open.length })} />
        <Kpi label={t('三单匹配通过率')} value={pct(apItems.filter((a) => a.status !== '匹配异常' && a.status !== '待匹配').length / apItems.length)} />
        <Kpi label={t('匹配异常')} value={apItems.filter((a) => a.status === '匹配异常').length} tone="loss" hint={t('需补单或例外审批')} />
        <Kpi label={t('30 天内应付')} value={wan(sum(open.filter((a) => daysBetween(TODAY, a.due) <= 30), (a) => a.invoice - a.paid), 2)} />
        <Kpi label="DPO" value={t('{n} 天', { n: dpo })} hint={t('应付周转天数')} />
      </div>

      <Card title={t('应付明细与三单匹配')} pad={false} className="mt-5">
        <Table>
          <thead>
            <tr>
              <Th>{t('编号')}</Th><Th>{t('供应商')}</Th><Th>{t('来源')}</Th><Th>{t('BU / 项目')}</Th>
              <Th right>{t('采购订单')}</Th><Th right>{t('入库单')}</Th><Th right>{t('供应商发票')}</Th>
              <Th>{t('到期日')}</Th><Th>{t('状态')}</Th><Th>{t('操作')}</Th>
            </tr>
          </thead>
          <tbody>
            {apItems.map((a) => {
              const sup = suppliers.find((s) => s.code === a.supplier)
              return (
                <tr key={a.id}>
                  <Td className="text-slate-500">{a.id}</Td>
                  <Td className="font-medium">
                    {supplierName(a.supplier)}
                    {sup?.related && <span className="ml-1.5"><Badge tone="amber">{t('关联方')}</Badge></span>}
                  </Td>
                  <Td>{t(a.source)}</Td>
                  <Td className="text-slate-600">{buName(a.bu)}{a.project && <div className="text-xs text-slate-400">{projectName(a.project)}</div>}</Td>
                  <Td right><Money v={a.po} /></Td>
                  <Td right><MatchCell base={a.po} v={a.receipt} /></Td>
                  <Td right><MatchCell base={a.po} v={a.invoice} /></Td>
                  <Td className="text-slate-500">{a.due}</Td>
                  <Td><Badge tone={STATUS_TONE[a.status]}>{t(a.status)}</Badge></Td>
                  <Td>
                    <div className="flex gap-1.5">
                      {a.status === '待匹配' && <Button size="sm" variant="outline" onClick={() => runThreeWayMatch(a.id)}>{t('三单匹配')}</Button>}
                      {a.status === '匹配异常' && <Button size="sm" variant="outline" onClick={() => approveApException(a.id)}>{t('例外审批')}</Button>}
                      {a.status === '已匹配' && <Button size="sm" onClick={() => requestPayment(a.id)}>{t('付款申请')}</Button>}
                      {a.status === '匹配异常' && <Button size="sm" disabled onClick={() => requestPayment(a.id)}>{t('付款申请')}</Button>}
                    </div>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title={t('付款计划与现金流预测（按到期日）')} className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={plan} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={axisWan} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => money(Number(v), true)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="已申请付款" name={t('已申请付款')} stackId="p" fill={CHART.navy} maxBarSize={56} />
              <Bar dataKey="已匹配" name={t('已匹配')} stackId="p" fill={CHART.profit} maxBarSize={56} />
              <Bar dataKey="待匹配" name={t('待匹配')} stackId="p" fill={CHART.slate} maxBarSize={56} />
              <Bar dataKey="匹配异常" name={t('匹配异常')} stackId="p" fill={CHART.loss} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title={t('付款审批分级')}>
          <div className="space-y-3 text-sm">
            {[
              ['≤ 5 万', '总账会计 → 财务总监'],
              ['5 万 - 50 万', '财务总监 → CFO'],
              ['> 50 万', 'CFO → CEO'],
              ['关联方付款', '额外法务 / 审计会签'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-3 border-b border-dashed border-slate-100 pb-2">
                <Badge tone="navy">{t(k)}</Badge>
                <span className="text-right text-slate-600">{t(v)}</span>
              </div>
            ))}
            <p className="pt-1 text-xs text-slate-500">{t('暂估：入库未收票按采购价暂估入 2202.99，收票后自动冲回并转入 2202 应付账款。')}</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
