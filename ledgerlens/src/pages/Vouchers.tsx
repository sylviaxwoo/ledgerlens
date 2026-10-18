import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCheck, Plus, RotateCw, Search, Send } from 'lucide-react'
import { Badge, Button, Card, Drawer, Empty, Kpi, LinkText, Money, PageHeader, StatusBadge, Table, Tabs, Td, Th, selectCls } from '../components/ui'
import { useDrill } from '../components/Drill'
import { useStore } from '../store'
import { accountName, bus, OPEN_PERIOD, projectName, projects, TODAY } from '../data/master'
import type { VoucherLine, VoucherStatus } from '../data/types'
import { cls, sum, yuan } from '../lib/format'
import { t } from '../i18n'

type Tab = 'list' | 'exceptions'
const STATUSES: (VoucherStatus | 'ALL')[] = ['ALL', '待审核', '已审核', '已过账', '已冲销']

export default function Vouchers() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'list'
  const { vouchers, exceptions } = useStore()
  const [manualOpen, setManualOpen] = useState(false)

  const stat = (s: VoucherStatus) => vouchers.filter((v) => v.status === s).length
  const auto = vouchers.filter((v) => !v.manual && !v.reversalOf).length
  const autoRate = auto / vouchers.filter((v) => !v.reversalOf).length

  return (
    <div>
      <PageHeader
        title={t('凭证管理')}
        subtitle={t('业务事件 → 规则引擎自动生成；制单、审核、过账三步分离；已过账凭证只能红冲')}
        actions={<Button onClick={() => setManualOpen(true)}><Plus size={15} />  {t('新建手工凭证')}</Button>}
      />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label={t('凭证自动化率')} value={`${(autoRate * 100).toFixed(1)}%`} tone={autoRate >= 0.9 ? 'profit' : 'loss'} hint={t('目标 ≥ 90%')} />
        <Kpi label={t('待审核')} value={stat('待审核')} hint={t('需审核人 ≠ 制单人')} />
        <Kpi label={t('已审核待过账')} value={stat('已审核')} />
        <Kpi label={t('已过账')} value={stat('已过账')} tone="profit" />
        <Kpi label={t('异常队列')} value={exceptions.length} tone={exceptions.length ? 'loss' : 'profit'} onClick={() => setParams({ tab: 'exceptions' })} hint={t('不允许过账，处理后重推')} />
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={(k) => setParams(k === 'list' ? {} : { tab: k })}
        tabs={[
          { key: 'list', label: t('凭证列表 ({n})', { n: vouchers.length }) },
          { key: 'exceptions', label: <span className="flex items-center gap-1.5">{t('异常队列')} {exceptions.length > 0 && <span className="rounded-full bg-loss px-1.5 text-[10px] text-white">{exceptions.length}</span>}</span> },
        ]}
      />

      {tab === 'list' ? <VoucherList projectFilter={params.get('project')} /> : <ExceptionQueue />}
      <ManualVoucherDrawer open={manualOpen} onClose={() => setManualOpen(false)} />
    </div>
  )
}

function VoucherList({ projectFilter }: { projectFilter: string | null }) {
  const { vouchers, reviewVoucher, postVoucher, toast } = useStore()
  const { openVoucher, openOrder } = useDrill()
  const [status, setStatus] = useState<VoucherStatus | 'ALL'>('ALL')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())

  const list = useMemo(
    () =>
      vouchers
        .filter((v) => status === 'ALL' || v.status === status)
        .filter((v) => !q || v.id.includes(q) || v.sourceDoc.includes(q) || v.event.includes(q))
        .filter((v) => !projectFilter || v.lines.some((l) => l.aux.project === projectFilter))
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [vouchers, status, q, projectFilter],
  )

  const toggle = (id: string) => setSel((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })

  const batch = (kind: 'review' | 'post') => {
    let ok = 0
    sel.forEach((id) => {
      if (kind === 'review' ? reviewVoucher(id) : postVoucher(id)) ok++
    })
    if (ok) toast('ok', kind === 'review' ? t('批量审核完成 {n} 张', { n: ok }) : t('批量过账完成 {n} 张', { n: ok }))
    setSel(new Set())
  }

  return (
    <Card
      pad={false}
      title={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('凭证号 / 单据号 / 事件')} className={cls(selectCls, 'w-56 pl-8')} />
          </div>
          <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as VoucherStatus | 'ALL')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s === 'ALL' ? t('全部状态') : t(s)}</option>)}
          </select>
          {projectFilter && <Badge tone="navy">{t('项目：')} {projectName(projectFilter)}</Badge>}
        </div>
      }
      extra={
        <>
          <span>{t('已选')} {sel.size}</span>
          <Button size="sm" variant="outline" disabled={!sel.size} onClick={() => batch('review')}><CheckCheck size={13} />  {t('批量审核')}</Button>
          <Button size="sm" variant="success" disabled={!sel.size} onClick={() => batch('post')}><Send size={13} />  {t('批量过账')}</Button>
        </>
      }
    >
      <Table>
        <thead>
          <tr>
            <Th className="w-8"><input type="checkbox" checked={sel.size > 0 && sel.size === list.filter((v) => v.status === '待审核' || v.status === '已审核').length} onChange={(e) => setSel(new Set(e.target.checked ? list.filter((v) => v.status === '待审核' || v.status === '已审核').map((v) => v.id) : []))} /></Th>
            <Th>{t('凭证号')}</Th>
            <Th>{t('日期')}</Th>
            <Th>{t('期间')}</Th>
            <Th>{t('业务事件')}</Th>
            <Th>{t('来源单据')}</Th>
            <Th>{t('主要科目')}</Th>
            <Th right>{t('金额')}</Th>
            <Th>{t('制单 / 审核')}</Th>
            <Th>{t('状态')}</Th>
          </tr>
        </thead>
        <tbody>
          {list.map((v) => {
            const amt = sum(v.lines, (l) => l.debit)
            const canSel = v.status === '待审核' || v.status === '已审核'
            const isOrder = v.sourceDoc.startsWith('SO-') || v.sourceDoc.startsWith('RT-')
            return (
              <tr key={v.id} className="hover:bg-slate-50/60">
                <Td><input type="checkbox" disabled={!canSel} checked={sel.has(v.id)} onChange={() => toggle(v.id)} /></Td>
                <Td><LinkText onClick={() => openVoucher(v.id)}>{v.id}</LinkText></Td>
                <Td className="text-slate-500">{v.date}</Td>
                <Td>{v.period}</Td>
                <Td>
                  {t(v.event)}
                  {v.manual && <span className="ml-1.5"><Badge>{t('手工')}</Badge></span>}
                </Td>
                <Td>{isOrder ? <LinkText onClick={() => openOrder(v.sourceDoc)}>{v.sourceDoc}</LinkText> : <span className="text-slate-500">{t(v.sourceDoc)}</span>}</Td>
                <Td className="text-xs text-slate-500">{accountName(v.lines[0].account)} / {accountName(v.lines[v.lines.length - 1].account)}</Td>
                <Td right><Money v={amt} /></Td>
                <Td className="text-xs text-slate-500">{v.maker} / {v.reviewer ?? '—'}</Td>
                <Td><StatusBadge status={v.status} /></Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
      {!list.length && <Empty>{t('没有符合条件的凭证')}</Empty>}
    </Card>
  )
}

function ExceptionQueue() {
  const { exceptions, orders, retryException, fixOrderBu, mapSubsidy, subsidyMapped } = useStore()
  const { openOrder } = useDrill()
  const [buPick, setBuPick] = useState<Record<string, string>>({})
  const reasons = ['科目映射缺失', '借贷不平', '期间已结账', '重复生成', '必填维度缺失'] as const

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-3">
        {reasons.map((r) => {
          const n = exceptions.filter((e) => e.reason === r).length
          return (
            <div key={r} className={cls('rounded-xl border bg-white px-4 py-3', n ? 'border-loss/30' : 'border-slate-200')}>
              <div className="text-xs text-slate-500">{t(r)}</div>
              <div className={cls('num mt-1 text-xl font-semibold', n ? 'text-loss' : 'text-slate-300')}>{n}</div>
            </div>
          )
        })}
      </div>
      <Card pad={false} title={<span className="flex items-center gap-1.5"><AlertTriangle size={15} className="text-loss" />  {t('待处理异常')}</span>} extra={t('处理根因后点击「重推」，规则引擎按幂等键重新生成')}>
        {exceptions.length === 0 ? (
          <Empty>{t('异常队列已清零，满足结账前检查条件 ✓')}</Empty>
        ) : (
          <Table>
            <thead>
              <tr><Th>{t('编号')}</Th><Th>{t('时间')}</Th><Th>{t('来源单据')}</Th><Th>{t('业务事件')}</Th><Th>{t('异常类型')}</Th><Th>{t('说明')}</Th><Th>{t('处理')}</Th></tr>
            </thead>
            <tbody>
              {exceptions.map((e) => {
                const o = orders.find((x) => x.id === e.sourceDoc)
                const needBu = e.reason === '必填维度缺失' && !o?.bu
                const needMap = e.reason === '科目映射缺失' && !subsidyMapped
                return (
                  <tr key={e.id}>
                    <Td className="text-slate-500">{e.id}</Td>
                    <Td className="text-slate-500">{e.time}</Td>
                    <Td><LinkText onClick={() => openOrder(e.sourceDoc)}>{e.sourceDoc}</LinkText></Td>
                    <Td>{t(e.event)}</Td>
                    <Td><Badge tone="red">{t(e.reason)}</Badge></Td>
                    <Td className="whitespace-normal text-slate-600">{t(e.detail)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        {needBu && (
                          <>
                            <select className={cls(selectCls, 'py-1 text-xs')} value={buPick[e.id] ?? ''} onChange={(ev) => setBuPick({ ...buPick, [e.id]: ev.target.value })}>
                              <option value="">{t('选择 BU…')}</option>
                              {bus.filter((b) => b.code !== 'GRP').map((b) => <option key={b.code} value={b.code}>{t(b.name)}</option>)}
                            </select>
                            <Button size="sm" variant="outline" disabled={!buPick[e.id]} onClick={() => fixOrderBu(e.sourceDoc, buPick[e.id])}>{t('补标签')}</Button>
                          </>
                        )}
                        {needMap && <Button size="sm" variant="outline" onClick={mapSubsidy}>{t('配置费用映射')}</Button>}
                        <Button size="sm" disabled={needBu || needMap} onClick={() => retryException(e.id)}><RotateCw size={12} />  {t('重推')}</Button>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}

const TEMPLATES = [
  { key: 'accrue', name: '计提：仓储费', debit: '6601.03', credit: '2202', memo: '仓储费计提' },
  { key: 'amort', name: '摊销：系统外包费', debit: '6602', credit: '2202', memo: '系统建设外包摊销' },
  { key: 'ads', name: '调整：广告费入账', debit: '6601.02', credit: '2202', memo: '广告投放费用' },
  { key: 'badDebt', name: '计提：坏账准备', debit: '6711', credit: '1122.02', memo: '按账龄计提坏账' },
]

function ManualVoucherDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addManualVoucher, role } = useStore()
  const [tpl, setTpl] = useState(TEMPLATES[0].key)
  const [amount, setAmount] = useState('50000')
  const [bu, setBu] = useState('BU-B2C')
  const [project, setProject] = useState('')
  const tplDef = TEMPLATES.find((x) => x.key === tpl)!
  const cents = yuan(Number(amount) || 0)
  const lines: VoucherLine[] = [
    { account: tplDef.debit, memo: tplDef.memo, debit: cents, credit: 0, aux: { bu, project: project || undefined } },
    { account: tplDef.credit, memo: tplDef.memo, debit: 0, credit: cents, aux: { bu } },
  ]
  return (
    <Drawer open={open} onClose={onClose} title={t('新建手工凭证')} width="max-w-xl">
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs text-slate-500">{t('凭证模板')}</span>
          <select className={cls(selectCls, 'mt-1 w-full')} value={tpl} onChange={(e) => setTpl(e.target.value)}>
            {TEMPLATES.map((x) => <option key={x.key} value={x.key}>{t(x.name)}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-slate-500">{t('金额（元）')}</span>
            <input className={cls(selectCls, 'mt-1 w-full')} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">{t('业务单元（必填）')}</span>
            <select className={cls(selectCls, 'mt-1 w-full')} value={bu} onChange={(e) => setBu(e.target.value)}>
              {bus.map((b) => <option key={b.code} value={b.code}>{t(b.name)}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-slate-500">{t('项目（项目类收支必填）')}</span>
          <select className={cls(selectCls, 'mt-1 w-full')} value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">{t('— 非项目 —')}</option>
            {projects.map((p) => <option key={p.code} value={p.code}>{t(p.name)}</option>)}
          </select>
        </label>
        <Card title={t('分录预览')} pad={false}>
          <Table>
            <thead><tr><Th>{t('科目')}</Th><Th right>{t('借方')}</Th><Th right>{t('贷方')}</Th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <Td>{l.account} {accountName(l.account)}</Td>
                  <Td right>{l.debit ? <Money v={l.debit} /> : ''}</Td>
                  <Td right>{l.credit ? <Money v={l.credit} /> : ''}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <p className="text-xs text-slate-500">{t('制单人：{name}。提交后需由其他人审核（不相容职责分离）。凭证期间：{p}。', { name: role.name, p: OPEN_PERIOD })}</p>
        <Button
          className="w-full"
          disabled={!cents}
          onClick={() => {
            addManualVoucher({ period: OPEN_PERIOD, date: TODAY, event: `手工 ${tplDef.name}`, sourceDoc: '手工录入', lines })
            onClose()
          }}
        >
          {t('提交审核')}</Button>
      </div>
    </Drawer>
  )
}
