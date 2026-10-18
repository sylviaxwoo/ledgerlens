import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Zap } from 'lucide-react'
import { Badge, Button, Card, CHART, Kpi, LinkText, Money, PageHeader, Table, Tabs, Td, Th } from '../components/ui'
import { orderParty, useDrill } from '../components/Drill'
import { useStore } from '../store'
import { buName, customers, projectName, shopName } from '../data/master'
import { seedSettlements } from '../data/seed'
import type { Order, OrderType } from '../data/types'
import { triggeredEvents } from '../lib/rules'
import { cls, money, pct, sum, wan } from '../lib/format'
import { t } from '../i18n'

type Tab = OrderType | 'SETTLE'

export default function Orders() {
  const [tab, setTab] = useState<Tab>('B2C')
  const { orders } = useStore()
  const count = (ty: OrderType) => orders.filter((o) => o.type === ty).length
  return (
    <div>
      <PageHeader title={t('订单中心')} subtitle={t('订单是业务入口：发货、签收、开票、退货入库等业务事件触发规则引擎生成凭证，单据与凭证双向追溯')} />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'B2C', label: t('B2C 订单 ({n})', { n: count('B2C') }) },
          { key: 'B2B', label: t('B2B 订单 ({n})', { n: count('B2B') }) },
          { key: 'RTN', label: t('退件 ({n})', { n: count('RTN') }) },
          { key: 'SETTLE', label: t('平台结算对账') },
        ]}
      />
      {tab === 'SETTLE' ? <Settlement /> : <OrderList type={tab} />}
    </div>
  )
}

function useVoucherState() {
  const { vouchers, exceptions } = useStore()
  return (o: Order) => {
    const evs = triggeredEvents(o)
    const done = evs.filter((ev) => vouchers.some((v) => !v.reversalOf && v.idemKey === `${o.id}|${ev}|v1`)).length
    const err = exceptions.some((e) => e.sourceDoc === o.id)
    return { done, total: evs.length, err }
  }
}

function OrderList({ type }: { type: OrderType }) {
  const { orders, generateForOrder, approveB2BCredit, arItems } = useStore()
  const { openOrder } = useDrill()
  const vs = useVoucherState()
  const list = orders.filter((o) => o.type === type)
  const pending = list.filter((o) => {
    const s = vs(o)
    return s.done < s.total && !s.err && o.status !== '信用冻结'
  })

  const revenue = sum(list, (o) => o.amount)
  const fees = sum(list, (o) => o.commission + o.ads + o.logistics + o.subsidy)
  const contribution = sum(list, (o) => o.amount - o.cost) - fees

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {type === 'RTN' ? (
          <>
            <Kpi label={t('退件单数')} value={list.length} hint={t('{n} 件', { n: sum(list, (o) => o.qty) })} />
            <Kpi label={t('红冲收入')} value={wan(revenue, 2)} tone="loss" />
            <Kpi label={t('退货损失（残次/报废/丢失）')} value={wan(sum(list.filter((o) => o.disposition !== '二次销售'), (o) => o.cost - (o.nrv ?? 0)), 2)} tone="loss" />
            <Kpi label={t('本月退货率（按件）')} value={pct(sum(list, (o) => o.qty) / sum(orders.filter((o) => o.type === 'B2C'), (o) => o.qty))} hint={t('B2C 口径')} />
          </>
        ) : (
          <>
            <Kpi label={t('订单数')} value={list.length} hint={type === 'B2C' ? t('逐单生成 / 支持按日店铺汇总') : t('逐单记账')} />
            <Kpi label={t('不含税收入')} value={wan(revenue, 2)} />
            <Kpi label={type === 'B2C' ? t('平台费 + 广告 + 物流') : t('物流费用')} value={wan(fees, 2)} />
            <Kpi label={t('贡献利润')} value={wan(contribution, 2)} tone={contribution >= 0 ? 'profit' : 'loss'} hint={t('率 {v}', { v: pct(contribution / revenue) })} />
          </>
        )}
      </div>

      <Card
        pad={false}
        title={type === 'B2C' ? t('B2C 平台订单') : type === 'B2B' ? t('B2B 合同订单') : t('退件单（关联原订单，逆向流程）')}
        extra={
          <Button size="sm" disabled={!pending.length} onClick={() => pending.forEach((o) => generateForOrder(o.id))}>
            <Zap size={13} />  {t('批量生成凭证（{n}）', { n: pending.length })}
          </Button>
        }
      >
        <Table>
          <thead>
            <tr>
              <Th>{t('单据号')}</Th>
              <Th>{t('日期')}</Th>
              <Th>{type === 'B2B' ? t('客户') : t('店铺')}</Th>
              <Th>{t('业务单元')}</Th>
              <Th>{t('项目')}</Th>
              {type === 'RTN' && <Th>{t('原订单')}</Th>}
              {type === 'RTN' && <Th>{t('原因 / 处置')}</Th>}
              <Th>{t('SKU × 数量')}</Th>
              <Th right>{t('不含税金额')}</Th>
              <Th right>{t('税额')}</Th>
              {type === 'B2B' && <Th>{t('信用额度占用')}</Th>}
              <Th>{t('单据状态')}</Th>
              <Th>{t('凭证')}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.map((o) => {
              const s = vs(o)
              const cust = customers.find((c) => c.code === o.customer)
              const used = cust ? sum(arItems.filter((a) => a.customer === cust.code), (a) => a.amount - a.settled) : 0
              const after = used + (o.status === '信用冻结' ? o.amount + o.tax : 0)
              return (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <Td><LinkText onClick={() => openOrder(o.id)}>{o.id}</LinkText></Td>
                  <Td className="text-slate-500">{o.date}</Td>
                  <Td>{orderParty(o)}</Td>
                  <Td>{o.bu ? buName(o.bu) : <Badge tone="red">{t('缺失')}</Badge>}</Td>
                  <Td className="text-slate-600">{o.project ? projectName(o.project) : '—'}</Td>
                  {type === 'RTN' && <Td><LinkText onClick={() => openOrder(o.origOrder!)}>{o.origOrder}</LinkText></Td>}
                  {type === 'RTN' && (
                    <Td>
                      <span className="text-slate-600">{t(o.reason ?? '')}</span>{' '}
                      <Badge tone={o.disposition === '二次销售' ? 'green' : o.disposition === '残次' ? 'amber' : 'red'}>{t(o.disposition ?? '')}</Badge>
                    </Td>
                  )}
                  <Td>{o.sku} × {o.qty}</Td>
                  <Td right><Money v={type === 'RTN' ? -o.amount : o.amount} /></Td>
                  <Td right><Money v={type === 'RTN' ? -o.tax : o.tax} /></Td>
                  {type === 'B2B' && cust && (
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div className={cls('h-full', after > cust.creditLimit ? 'bg-loss' : 'bg-navy')} style={{ width: `${Math.min(100, (after / cust.creditLimit) * 100)}%` }} />
                        </div>
                        <span className={cls('num text-xs', after > cust.creditLimit ? 'text-loss' : 'text-slate-500')}>{pct(after / cust.creditLimit, 0)}</span>
                      </div>
                    </Td>
                  )}
                  <Td><Badge tone={o.status === '信用冻结' ? 'red' : o.status.includes('结算') || o.status.includes('开票') || o.status === '已退款' ? 'green' : 'slate'}>{t(o.status)}</Badge></Td>
                  <Td>
                    {s.err ? (
                      <Badge tone="red">{t('异常')}</Badge>
                    ) : s.total === 0 ? (
                      <Badge>{t('待触发')}</Badge>
                    ) : s.done === s.total ? (
                      <Badge tone="green">{s.done}/{s.total} {t('已生成')}</Badge>
                    ) : s.done > 0 ? (
                      <Badge tone="amber">{s.done}/{s.total}</Badge>
                    ) : (
                      <Badge>{t('未生成')}</Badge>
                    )}
                  </Td>
                  <Td>
                    {o.status === '信用冻结' ? (
                      <Button size="sm" variant="outline" onClick={() => approveB2BCredit(o.id)}>{t('超额审批')}</Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => generateForOrder(o.id)}>{t('生成凭证')}</Button>
                    )}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Card>

      {type === 'RTN' && <ReturnAnalysis list={list} />}
      {type === 'B2C' && (
        <p className="text-xs text-slate-500">{t('提示：再次点击已生成订单的「生成凭证」可验证幂等控制（单据号 + 事件类型 + 版本为唯一键）；9 月订单因期间已结账，会自动顺延到 10 月。')}</p>
      )}
    </div>
  )
}

function ReturnAnalysis({ list }: { list: Order[] }) {
  const byReason = Object.entries(list.reduce<Record<string, number>>((m, o) => ({ ...m, [o.reason!]: (m[o.reason!] ?? 0) + o.qty }), {})).map(([name, qty]) => ({ name: t(name), qty }))
  const byDisp = ['二次销售', '残次', '报废', '丢失'].map((d) => {
    const xs = list.filter((o) => o.disposition === d)
    return { d, n: xs.length, loss: sum(xs, (o) => (d === '二次销售' ? 0 : o.cost - (o.nrv ?? 0))) }
  })
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card title={t('退货原因分布（件）')}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byReason} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="qty" name={t('件数')} fill={CHART.navy} maxBarSize={40} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card title={t('处置方式与会计处理')} pad={false}>
        <Table>
          <thead>
            <tr><Th>{t('处置')}</Th><Th>{t('库存处理')}</Th><Th>{t('财务处理')}</Th><Th right>{t('单数')}</Th><Th right>{t('损失')}</Th></tr>
          </thead>
          <tbody>
            {byDisp.map(({ d, n, loss }) => (
              <tr key={d}>
                <Td className="font-medium">{t(d)}</Td>
                <Td className="text-slate-600">{t({ 二次销售: '回库存', 残次: '入残次仓，按可变现净值', 报废: '不入库', 丢失: '无' }[d] ?? '')}</Td>
                <Td className="whitespace-normal text-xs text-slate-600">{t({ 二次销售: '红冲收入，成本回冲，库存增加', 残次: '红冲收入，差额计入退货损失', 报废: '红冲收入，成本转退货损失', 丢失: '红冲收入，按责任方索赔或计损失' }[d] ?? '')}</Td>
                <Td right>{n}</Td>
                <Td right className={loss ? 'text-loss' : ''}>{money(loss)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}

function Settlement() {
  const lines = seedSettlements
  const matched = lines.filter((l) => l.status === '已匹配').length
  const rate = matched / lines.length
  const diffs = lines.filter((l) => l.status !== '已匹配')
  const diffAmt = sum(diffs, (l) => l.received - l.expected)
  const byType = ['扣款', '延迟', '保证金', '费率差异', '其他'].map((dt) => ({ t: dt, label: t(dt), n: diffs.filter((d) => d.diffType === dt).length, amt: sum(diffs.filter((d) => d.diffType === dt), (d) => d.received - d.expected) }))
  const { openOrder } = useDrill()
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label={t('结算单行数')} value={lines.length} hint={t('2026-10 第 2 周导入')} />
        <Kpi label={t('自动匹配率')} value={pct(rate)} tone={rate >= 0.85 ? 'profit' : 'loss'} hint={t('目标 ≥ 85%')} />
        <Kpi label={t('差异项')} value={diffs.length} tone="loss" hint={t('已进入差异清单')} />
        <Kpi label={t('差异净额')} value={money(diffAmt)} tone={diffAmt < 0 ? 'loss' : 'profit'} hint={t('实收 − 应收')} />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title={t('结算单逐笔匹配')} pad={false} className="xl:col-span-2">
          <Table>
            <thead>
              <tr><Th>{t('结算行')}</Th><Th>{t('店铺')}</Th><Th>{t('订单')}</Th><Th right>{t('应收（扣费后）')}</Th><Th right>{t('实收')}</Th><Th right>{t('差异')}</Th><Th>{t('匹配结果')}</Th></tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id}>
                  <Td className="text-slate-500">{l.id}</Td>
                  <Td>{shopName(l.shop)}</Td>
                  <Td>{l.order.startsWith('SO-B2C-261') ? <LinkText onClick={() => openOrder(l.order)}>{l.order}</LinkText> : <span className="text-slate-500">{l.order}</span>}</Td>
                  <Td right><Money v={l.expected} /></Td>
                  <Td right><Money v={l.received} /></Td>
                  <Td right><Money v={l.received - l.expected} signed /></Td>
                  <Td>
                    {l.status === '已匹配' ? <Badge tone="green">{t('已匹配')}</Badge> : <Badge tone={l.status === '差异' ? 'amber' : 'red'}>{t(l.status)} · {t(l.diffType ?? '')}</Badge>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card title={t('差异归因')}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byType} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="n" name={t('笔数')} maxBarSize={32} radius={[4, 4, 0, 0]}>
                {byType.map((b) => <Cell key={b.t} fill={b.t === '延迟' || b.t === '保证金' ? CHART.amber : CHART.loss} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5 text-sm">
            {byType.filter((b) => b.n).map((b) => (
              <div key={b.t} className="flex justify-between"><span className="text-slate-600">{t('{type}（{n} 笔）', { type: b.label, n: b.n })}</span><Money v={b.amt} /></div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">{t('扣款与费率差异需补录费用凭证；延迟回款转入平台待结算款跟进；保证金计入其他应收。')}</p>
        </Card>
      </div>
    </div>
  )
}
