import { Fragment, useMemo, useState } from 'react'
import { CheckCircle2, Circle, Lock, LockOpen, XCircle } from 'lucide-react'
import { Badge, Button, Card, Kpi, LinkText, Money, PageHeader, Table, Tabs, Td, Th } from '../components/ui'
import { useDrill } from '../components/Drill'
import { useStore } from '../store'
import { accounts, bus, buName, OPEN_PERIOD } from '../data/master'
import type { AccountCategory, Voucher } from '../data/types'
import { triggeredEvents } from '../lib/rules'
import { cls, money, sum, yuan } from '../lib/format'
import { t } from '../i18n'

const OPENING: Record<string, number> = {
  '1002': yuan(5_200_000),
  '1122.02': yuan(450_000),
  '1405': yuan(2_350_000),
  '2202': yuan(800_000),
  '4001': yuan(7_200_000),
}

type Tab = 'tb' | 'pl' | 'bs' | 'close'

function useBalances(vouchers: Voucher[]) {
  return useMemo(() => {
    const posted = vouchers.filter((v) => v.status === '已过账' || v.status === '已冲销')
    return accounts.map((a) => {
      const lines = posted.flatMap((v) => v.lines.filter((l) => l.account === a.code).map((l) => ({ ...l, v })))
      const dr = sum(lines, (l) => l.debit)
      const cr = sum(lines, (l) => l.credit)
      const open = OPENING[a.code] ?? 0
      const sign = a.direction === '借' ? 1 : -1
      const close = open + sign * (dr - cr)
      return { a, open, dr, cr, close, lines }
    })
  }, [vouchers])
}

export default function Ledger() {
  const [tab, setTab] = useState<Tab>('tb')
  const { vouchers } = useStore()
  const rows = useBalances(vouchers)
  const totDr = sum(rows, (r) => r.dr)
  const totCr = sum(rows, (r) => r.cr)
  const openDr = sum(rows.filter((r) => r.a.direction === '借'), (r) => r.open)
  const openCr = sum(rows.filter((r) => r.a.direction === '贷'), (r) => r.open)
  const closeDr = sum(rows.filter((r) => r.a.direction === '借'), (r) => r.close)
  const closeCr = sum(rows.filter((r) => r.a.direction === '贷'), (r) => r.close)
  const balanced = totDr === totCr && closeDr === closeCr

  return (
    <div>
      <PageHeader title={t('总账与报表')} subtitle={t('汇总所有已过账凭证 · 主体 CN01 · 期间 {p} · 账面口径来源', { p: OPEN_PERIOD })} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label={t('本期借方发生额')} value={money(totDr)} />
        <Kpi label={t('本期贷方发生额')} value={money(totCr)} />
        <Kpi label={t('试算平衡')} value={balanced ? t('平衡') : t('不平衡')} tone={balanced ? 'profit' : 'loss'} hint={t('期末借 {d} / 贷 {c}', { d: money(closeDr), c: money(closeCr) })} />
        <Kpi label={t('已过账凭证')} value={vouchers.filter((v) => v.status === '已过账' || v.status === '已冲销').length} hint={t('共 {n} 张', { n: vouchers.length })} />
      </div>
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'tb', label: t('科目余额表') },
          { key: 'pl', label: t('利润表（按 BU）') },
          { key: 'bs', label: t('资产负债表') },
          { key: 'close', label: t('期末结账') },
        ]}
      />
      {tab === 'tb' && <TrialBalance rows={rows} totals={{ openDr, openCr, totDr, totCr, closeDr, closeCr }} />}
      {tab === 'pl' && <ProfitByBu rows={rows} />}
      {tab === 'bs' && <BalanceSheet rows={rows} />}
      {tab === 'close' && <PeriodClose balanced={balanced} />}
    </div>
  )
}

type Row = ReturnType<typeof useBalances>[number]

function TrialBalance({ rows, totals }: { rows: Row[]; totals: Record<string, number> }) {
  const [open, setOpen] = useState<string | null>(null)
  const { openVoucher } = useDrill()
  return (
    <Card pad={false} title={t('科目余额表（点击科目下钻到凭证）')}>
      <Table>
        <thead>
          <tr>
            <Th>{t('科目编码')}</Th><Th>{t('科目名称')}</Th><Th>{t('类别')}</Th><Th>{t('方向')}</Th>
            <Th right>{t('期初余额')}</Th><Th right>{t('本期借方')}</Th><Th right>{t('本期贷方')}</Th><Th right>{t('期末余额')}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Fragment key={r.a.code}>
              <tr className={cls('cursor-pointer hover:bg-slate-50', open === r.a.code && 'bg-navy-50/50')} onClick={() => setOpen(open === r.a.code ? null : r.a.code)}>
                <Td className="font-medium">{r.a.code}</Td>
                <Td>{t(r.a.name)}</Td>
                <Td className="text-slate-500">{t(r.a.category)}</Td>
                <Td className="text-slate-500">{t(r.a.direction)}</Td>
                <Td right><Money v={r.open} /></Td>
                <Td right>{r.dr ? <Money v={r.dr} /> : '—'}</Td>
                <Td right>{r.cr ? <Money v={r.cr} /> : '—'}</Td>
                <Td right className="font-semibold"><Money v={r.close} /></Td>
              </tr>
              {open === r.a.code && (
                <tr>
                  <td colSpan={8} className="bg-slate-50/70 px-6 py-2">
                    {r.lines.length === 0 ? (
                      <div className="py-2 text-xs text-slate-400">{t('本期无发生额')}</div>
                    ) : (
                      <table className="w-full text-xs">
                        <tbody>
                          {r.lines.map((l, i) => (
                            <tr key={i} className="border-b border-slate-100 last:border-0">
                              <td className="py-1.5"><LinkText onClick={() => openVoucher(l.v.id)}>{l.v.id}</LinkText></td>
                              <td className="py-1.5 text-slate-500">{l.v.date}</td>
                              <td className="py-1.5 text-slate-600">{t(l.memo)}</td>
                              <td className="py-1.5 text-slate-500">{t(l.v.sourceDoc)}</td>
                              <td className="num py-1.5 text-right">{l.debit ? money(l.debit) : ''}</td>
                              <td className="num py-1.5 text-right">{l.credit ? money(l.credit) : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          <tr className="bg-slate-50 font-semibold">
            <Td colSpan={4}>{t('合计（借 / 贷）')}</Td>
            <Td right className="text-xs">{money(totals.openDr)}<br />{money(totals.openCr)}</Td>
            <Td right>{money(totals.totDr)}</Td>
            <Td right>{money(totals.totCr)}</Td>
            <Td right className="text-xs">{money(totals.closeDr)}<br />{money(totals.closeCr)}</Td>
          </tr>
        </tbody>
      </Table>
    </Card>
  )
}

function ProfitByBu({ rows }: { rows: Row[] }) {
  const buCodes = [...bus.filter((b) => b.code !== 'GRP').map((b) => b.code), 'GRP']
  const lineFor = (cats: AccountCategory[], codes?: string[]) =>
    rows.filter((r) => cats.includes(r.a.category) && (!codes || codes.includes(r.a.code)))
  const amt = (cats: AccountCategory[], bu: string | null, codes?: string[]) =>
    sum(lineFor(cats, codes), (r) =>
      sum(r.lines.filter((l) => bu === null || (l.aux.bu ?? 'GRP') === bu), (l) => (r.a.direction === '贷' ? l.credit - l.debit : l.debit - l.credit)),
    )
  const items: { k: string; f: (bu: string | null) => number; bold?: boolean; neg?: boolean }[] = [
    { k: '主营业务收入', f: (b) => amt(['收入'], b) },
    { k: '主营业务成本', f: (b) => amt(['成本'], b), neg: true },
    { k: '毛利', f: (b) => amt(['收入'], b) - amt(['成本'], b), bold: true },
    { k: '销售费用-佣金', f: (b) => amt(['费用'], b, ['6601.01']), neg: true },
    { k: '销售费用-广告', f: (b) => amt(['费用'], b, ['6601.02']), neg: true },
    { k: '销售费用-物流/仓储', f: (b) => amt(['费用'], b, ['6601.03']), neg: true },
    { k: '促销补贴', f: (b) => amt(['费用'], b, ['6601.04']), neg: true },
    { k: '退货损失', f: (b) => amt(['费用'], b, ['6711']), neg: true },
    { k: '管理费用', f: (b) => amt(['费用'], b, ['6602']), neg: true },
    { k: 'BU 净利润', f: (b) => amt(['收入'], b) - amt(['成本'], b) - amt(['费用'], b), bold: true },
  ]
  return (
    <Card pad={false} title={t('利润表（{p}，按凭证行 BU 标签切片）', { p: OPEN_PERIOD })} extra={t('数据来源：已过账凭证')}>
      <Table>
        <thead>
          <tr>
            <Th>{t('项目')}</Th>
            {buCodes.map((b) => <Th key={b} right>{b === 'GRP' ? t('集团/公共') : buName(b)}</Th>)}
            <Th right>{t('合计')}</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.k} className={cls(it.bold && 'bg-slate-50 font-semibold')}>
              <Td className={cls(!it.bold && 'pl-6 text-slate-600')}>{t(it.k)}</Td>
              {buCodes.map((b) => {
                const v = it.f(b)
                return <Td key={b} right className={cls(it.bold && (v >= 0 ? 'text-profit' : 'text-loss'))}>{v === 0 ? '—' : money(it.neg ? -v : v)}</Td>
              })}
              <Td right className={cls(it.bold && (it.f(null) >= 0 ? 'text-profit' : 'text-loss'))}>{money(it.neg ? -it.f(null) : it.f(null))}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}

function Section({ title, list, extra }: { title: string; list: Row[]; extra?: [string, number] }) {
  return (
    <>
      <tr className="bg-slate-50"><Td colSpan={2} className="font-semibold text-navy">{title}</Td></tr>
      {list.map((r) => (
        <tr key={r.a.code}><Td className="pl-6 text-slate-600">{r.a.code} {t(r.a.name)}</Td><Td right><Money v={r.close} /></Td></tr>
      ))}
      {extra && <tr><Td className="pl-6 text-slate-600">{extra[0]}</Td><Td right><Money v={extra[1]} /></Td></tr>}
    </>
  )
}

function BalanceSheet({ rows }: { rows: Row[] }) {
  const by = (c: AccountCategory) => rows.filter((r) => r.a.category === c && r.a.code !== '4103')
  const profit = sum(rows.filter((r) => r.a.category === '收入'), (r) => r.close) - sum(rows.filter((r) => ['成本', '费用'].includes(r.a.category)), (r) => r.close)
  const assets = sum(by('资产'), (r) => r.close)
  const liab = sum(by('负债'), (r) => r.close)
  const equity = sum(by('权益'), (r) => r.close) + profit
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card pad={false} title={t('资产')}>
        <Table><tbody>
          <Section title={t('资产')} list={by('资产')} />
          <tr className="font-semibold"><Td>{t('资产合计')}</Td><Td right><Money v={assets} /></Td></tr>
        </tbody></Table>
      </Card>
      <Card pad={false} title={t('负债和所有者权益')}>
        <Table><tbody>
          <Section title={t('负债')} list={by('负债')} />
          <Section title={t('所有者权益')} list={by('权益')} extra={[t('本期利润（未结转）'), profit]} />
          <tr className="font-semibold"><Td>{t('负债和权益合计')}</Td><Td right><Money v={liab + equity} /></Td></tr>
          <tr><Td colSpan={2}>{assets === liab + equity ? <Badge tone="green"><CheckCircle2 size={12} />  {t('资产 = 负债 + 权益')}</Badge> : <Badge tone="red">{t('不平衡')}</Badge>}</Td></tr>
        </tbody></Table>
      </Card>
    </div>
  )
}

function PeriodClose({ balanced }: { balanced: boolean }) {
  const { exceptions, vouchers, orders, periodClosed, closePeriod, reopenPeriod, toast, role } = useStore()
  const [fxDone, setFxDone] = useState(false)
  const [settleExplained, setSettleExplained] = useState(false)
  const unposted = vouchers.filter((v) => v.status === '待审核' || v.status === '已审核').length
  const ungenerated = orders.filter((o) => o.status !== '信用冻结' && o.date.startsWith(OPEN_PERIOD)).filter((o) =>
    triggeredEvents(o).some((ev) => !vouchers.some((v) => v.idemKey === `${o.id}|${ev}|v1`)),
  ).length
  const checks = [
    { k: '本期业务单据均已生成凭证', ok: ungenerated === 0, info: ungenerated ? t('{n} 张单据未完整生成凭证', { n: ungenerated }) : t('全部生成') },
    { k: '异常队列为空', ok: exceptions.length === 0, info: exceptions.length ? t('{n} 条异常待处理', { n: exceptions.length }) : t('已清零') },
    { k: '所有凭证已审核并过账', ok: unposted === 0, info: unposted ? t('{n} 张未过账', { n: unposted }) : t('全部过账') },
    { k: '应收、应付、存货、资金明细账与总账余额一致', ok: true, info: t('子账核对通过') },
    { k: '平台待结算款已对账，差异已入账或已说明', ok: settleExplained, info: settleExplained ? t('4 项差异已说明') : t('4 项差异待说明'), action: !settleExplained && <Button size="sm" variant="outline" onClick={() => { setSettleExplained(true); toast('ok', t('平台对账差异已附说明')) }}>{t('标记已说明')}</Button> },
    { k: '期末汇率已更新，汇兑损益已计提', ok: fxDone, info: fxDone ? t('USD 7.1280 / MXN 0.3912 已更新') : t('待执行期末处理'), action: !fxDone && <Button size="sm" variant="outline" onClick={() => { setFxDone(true); toast('ok', t('期末处理完成：汇兑损益、成本结转、损益结转模板已生成')) }}>{t('执行期末处理')}</Button> },
    { k: '科目余额表试算平衡', ok: balanced, info: balanced ? t('借贷平衡') : t('不平衡') },
  ]
  const allOk = checks.every((c) => c.ok)
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Card title={t('结账前检查清单 · {p}', { p: OPEN_PERIOD })} className="xl:col-span-2">
        <div className="divide-y divide-slate-100">
          {checks.map((c) => (
            <div key={c.k} className="flex items-center gap-3 py-3">
              {c.ok ? <CheckCircle2 size={19} className="text-profit" /> : periodClosed ? <Circle size={19} className="text-slate-300" /> : <XCircle size={19} className="text-loss" />}
              <div className="flex-1">
                <div className="text-sm font-medium text-ink">{t(c.k)}</div>
                <div className={cls('text-xs', c.ok ? 'text-slate-500' : 'text-loss')}>{c.info}</div>
              </div>
              {c.action}
            </div>
          ))}
        </div>
      </Card>
      <Card title={t('结账操作')}>
        <div className="space-y-4">
          <div className={cls('rounded-lg p-4 text-sm', periodClosed ? 'bg-slate-100 text-slate-600' : allOk ? 'bg-profit-50 text-emerald-800' : 'bg-loss-50 text-loss')}>
            {periodClosed ? t('{p} 已结账。新单据凭证将顺延到下一开放期间。', { p: OPEN_PERIOD }) : allOk ? t('检查全部通过，可以结账。') : t('还有 {n} 项检查未通过，不能结账。', { n: checks.filter((c) => !c.ok).length })}
          </div>
          {periodClosed ? (
            <Button variant="outline" className="w-full" onClick={reopenPeriod}><LockOpen size={15} />  {t('反结账（需财务总监或 CFO 审批）')}</Button>
          ) : (
            <Button className="w-full" disabled={!allOk} onClick={closePeriod}><Lock size={15} />  {t('结账并保存 ROI 快照')}</Button>
          )}
          <p className="text-xs leading-relaxed text-slate-500">{t('当前角色：{name}（{title}）。反结账需审批并留痕，反结账后下游期间期初余额自动重算。', { name: role.name, title: t(role.title) })}</p>
        </div>
      </Card>
    </div>
  )
}
