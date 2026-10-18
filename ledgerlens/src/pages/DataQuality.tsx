import { useNavigate } from 'react-router-dom'
import { AlertTriangle, FileWarning, Scale, Tags } from 'lucide-react'
import { Badge, Button, Card, Kpi, LinkText, PageHeader, Table, Td, Th } from '../components/ui'
import { useDrill } from '../components/Drill'
import { useStore } from '../store'
import { seedSettlements } from '../data/seed'
import { OPEN_PERIOD } from '../data/master'
import { triggeredEvents } from '../lib/rules'
import { cls, pct } from '../lib/format'
import { t } from '../i18n'

export default function DataQuality() {
  const { orders, vouchers, exceptions, apItems } = useStore()
  const { openOrder } = useDrill()
  const nav = useNavigate()

  const missingVoucher = orders.flatMap((o) =>
    triggeredEvents(o).filter((ev) => !vouchers.some((v) => v.idemKey === `${o.id}|${ev}|v1`)).map((ev) => ({ o, ev })),
  )
  const untagged = vouchers.flatMap((v) => v.lines.filter((l) => ['6001', '6401'].includes(l.account) && !l.aux.bu).map((l) => ({ v, l })))
  const unprojectTagged = orders.filter((o) => !o.bu)
  const settleDiff = seedSettlements.filter((s) => s.status !== '已匹配').length
  const unposted = vouchers.filter((v) => v.status === '待审核' || v.status === '已审核').length
  const apIssues = apItems.filter((a) => a.status === '匹配异常' || a.status === '待匹配').length
  const totalEvents = orders.reduce((a, o) => a + triggeredEvents(o).length, 0)
  const coverage = 1 - missingVoucher.length / totalEvents
  const score = Math.max(0, Math.round(100 - missingVoucher.length * 2 - exceptions.length * 4 - settleDiff * 2 - unposted - unprojectTagged.length * 5))

  return (
    <div>
      <PageHeader title={t('数据质量')} subtitle={t('未生成凭证单据、对账差异、未结账事项、异常队列与「未归类」标签的统一跟进看板')} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label={t('数据质量评分')} value={score} tone={score >= 85 ? 'profit' : 'loss'} hint={t('满分 100')} />
        <Kpi label={t('单据凭证覆盖率')} value={pct(coverage)} hint={t('{n} 个事件未生成', { n: missingVoucher.length })} icon={<FileWarning size={15} />} />
        <Kpi label={t('异常队列')} value={exceptions.length} tone={exceptions.length ? 'loss' : 'profit'} onClick={() => nav('/vouchers?tab=exceptions')} icon={<AlertTriangle size={15} />} />
        <Kpi label={t('对账差异')} value={settleDiff + apIssues} tone="loss" hint={t('平台 {a} · 三单 {b}', { a: settleDiff, b: apIssues })} icon={<Scale size={15} />} />
        <Kpi label={t('「未归类」BU 标签')} value={unprojectTagged.length + untagged.length} tone={unprojectTagged.length ? 'loss' : 'profit'} hint={t('需跟进清零')} icon={<Tags size={15} />} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title={t('未生成凭证的业务事件')} pad={false} extra={<Button size="sm" variant="ghost" onClick={() => nav('/orders')}>{t('去订单中心')}</Button>}>
          <Table>
            <thead><tr><Th>{t('单据')}</Th><Th>{t('类型')}</Th><Th>{t('事件')}</Th><Th>{t('单据状态')}</Th><Th>{t('原因')}</Th></tr></thead>
            <tbody>
              {missingVoucher.map(({ o, ev }) => {
                const ex = exceptions.find((e) => e.sourceDoc === o.id && e.event === ev)
                return (
                  <tr key={`${o.id}-${ev}`}>
                    <Td><LinkText onClick={() => openOrder(o.id)}>{o.id}</LinkText></Td>
                    <Td>{o.type === 'RTN' ? t('退件') : o.type}</Td>
                    <Td>{t(ev)}</Td>
                    <Td><Badge>{t(o.status)}</Badge></Td>
                    <Td>{ex ? <Badge tone="red">{t(ex.reason)}</Badge> : o.status === '信用冻结' ? <Badge tone="amber">{t('信用冻结')}</Badge> : <Badge tone="slate">{t('待触发')}</Badge>}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Card>

        <Card title={t('未结账事项 · {p}', { p: OPEN_PERIOD })}>
          <div className="space-y-3">
            {[
              { k: '未审核 / 未过账凭证', n: unposted, to: '/vouchers' },
              { k: '异常队列', n: exceptions.length, to: '/vouchers?tab=exceptions' },
              { k: '平台结算差异待说明', n: settleDiff, to: '/orders' },
              { k: '三单匹配未通过 / 待匹配', n: apIssues, to: '/ap' },
              { k: '缺少 BU 标签的业务单据', n: unprojectTagged.length, to: '/vouchers?tab=exceptions' },
            ].map((x) => (
              <button key={x.k} onClick={() => nav(x.to)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-navy/40">
                <span className="text-sm text-ink">{t(x.k)}</span>
                <span className={cls('num text-lg font-semibold', x.n ? 'text-loss' : 'text-profit')}>{x.n}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
