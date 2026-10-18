import { createContext, useContext, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowRightLeft, CheckCircle2, FileText, Link2, XCircle } from 'lucide-react'
import { useStore } from '../store'
import { accountName, buName, customerName, projectName, shopName, skuName, supplierName } from '../data/master'
import type { Aux, Order } from '../data/types'
import { Badge, Button, Card, Drawer, Field, LinkText, Money, StatusBadge, Table, Td, Th } from './ui'
import { money, sum } from '../lib/format'
import { ORDER_EVENTS, triggeredEvents } from '../lib/rules'
import { t } from '../i18n'

type Drill = { openVoucher: (id: string) => void; openOrder: (id: string) => void }
const Ctx = createContext<Drill | null>(null)

export function useDrill() {
  const d = useContext(Ctx)
  if (!d) throw new Error('DrillProvider missing')
  return d
}

export function AuxTags({ aux }: { aux: Aux }) {
  const tags: [string, string][] = []
  if (aux.bu) tags.push(['BU', buName(aux.bu)])
  if (aux.project) tags.push([t('项目'), projectName(aux.project)])
  if (aux.shop) tags.push([t('店铺'), shopName(aux.shop)])
  if (aux.sku) tags.push(['SKU', aux.sku])
  if (aux.customer) tags.push([t('客户'), customerName(aux.customer)])
  if (aux.supplier) tags.push([t('供应商'), supplierName(aux.supplier)])
  if (!tags.length) return <span className="text-xs text-slate-400">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(([k, v]) => (
        <span key={k} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
          <span className="text-slate-400">{k}:</span> {v}
        </span>
      ))}
    </div>
  )
}

export function orderParty(o: Order) {
  return o.type === 'B2B' ? customerName(o.customer) : shopName(o.channel)
}

export function DrillProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [state, setState] = useState<{ vid: string | null; oid: string | null; path: string }>({ vid: null, oid: null, path: pathname })
  const vid = state.path === pathname ? state.vid : null
  const oid = state.path === pathname ? state.oid : null
  const setVid = (id: string | null) => setState({ vid: id, oid: null, path: pathname })
  const setOid = (id: string | null) => setState({ vid: null, oid: id, path: pathname })
  return (
    <Ctx.Provider value={{ openVoucher: setVid, openOrder: setOid }}>
      {children}
      <VoucherDrawer id={vid} onClose={() => setVid(null)} openOrder={setOid} openVoucher={setVid} />
      <OrderDrawer id={oid} onClose={() => setOid(null)} openVoucher={setVid} openOrder={setOid} />
    </Ctx.Provider>
  )
}

function VoucherDrawer({ id, onClose, openOrder, openVoucher }: { id: string | null; onClose: () => void; openOrder: (id: string) => void; openVoucher: (id: string) => void }) {
  const { vouchers, orders, reviewVoucher, postVoucher, reverseVoucher, toast } = useStore()
  const v = vouchers.find((x) => x.id === id)
  if (!v) return null
  const dr = sum(v.lines, (l) => l.debit)
  const cr = sum(v.lines, (l) => l.credit)
  const isOrder = orders.some((o) => o.id === v.sourceDoc)
  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <FileText size={18} className="text-navy" />
          {t('记账凭证')} {v.id}
          <StatusBadge status={v.status} />
          {v.reversalOf && <Badge tone="red">{t('红字冲销')}</Badge>}
        </div>
      }
    >
      <div className="space-y-5">
        <Card>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Field label={t('会计期间')}>{v.period}</Field>
            <Field label={t('凭证日期')}>{v.date}</Field>
            <Field label={t('业务事件')}>{t(v.event)}</Field>
            <Field label={t('来源单据')}>
              {isOrder ? <LinkText onClick={() => openOrder(v.sourceDoc)}>{v.sourceDoc}</LinkText> : v.sourceDoc}
            </Field>
            <Field label={t('制单人')}>{v.maker}</Field>
            <Field label={t('审核人')}>{v.reviewer ?? '—'}</Field>
            <Field label={t('幂等键')}>
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{v.idemKey}</code>
            </Field>
            <Field label={t('生成方式')}>{v.manual ? t('手工凭证') : t('规则引擎自动生成')}</Field>
          </div>
          {(v.reversalOf || v.reversedBy) && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-loss-50 px-3 py-2 text-sm text-loss">
              <ArrowRightLeft size={15} />
              {v.reversalOf ? (
                <>{t('冲销原凭证')} <LinkText onClick={() => openVoucher(v.reversalOf!)}>{v.reversalOf}</LinkText></>
              ) : (
                <>{t('已被红字凭证冲销：')} <LinkText onClick={() => openVoucher(v.reversedBy!)}>{v.reversedBy}</LinkText></>
              )}
            </div>
          )}
        </Card>

        <Card title={t('分录')} pad={false}>
          <Table>
            <thead>
              <tr>
                <Th>{t('科目')}</Th>
                <Th>{t('摘要')}</Th>
                <Th>{t('辅助核算（标签）')}</Th>
                <Th right>{t('借方')}</Th>
                <Th right>{t('贷方')}</Th>
              </tr>
            </thead>
            <tbody>
              {v.lines.map((l, i) => (
                <tr key={i}>
                  <Td>
                    <div className="font-medium">{l.account}</div>
                    <div className="text-xs text-slate-500">{accountName(l.account)}</div>
                  </Td>
                  <Td className="text-slate-600">{t(l.memo)}</Td>
                  <Td className="whitespace-normal">
                    <AuxTags aux={l.aux} />
                  </Td>
                  <Td right>{l.debit ? <Money v={l.debit} /> : ''}</Td>
                  <Td right>{l.credit ? <Money v={l.credit} /> : ''}</Td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <Td>{t('合计')}</Td>
                <Td />
                <Td>
                  {dr === cr ? (
                    <span className="inline-flex items-center gap-1 text-xs text-profit"><CheckCircle2 size={14} />  {t('借贷平衡')}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-loss"><XCircle size={14} />  {t('借贷不平')}</span>
                  )}
                </Td>
                <Td right><Money v={dr} /></Td>
                <Td right><Money v={cr} /></Td>
              </tr>
            </tbody>
          </Table>
        </Card>

        <div className="flex flex-wrap gap-2">
          {v.status === '待审核' && (
            <Button onClick={() => reviewVoucher(v.id) && toast('ok', t('{id} 审核通过', { id: v.id }))}>{t('审核')}</Button>
          )}
          {v.status === '已审核' && (
            <Button variant="success" onClick={() => postVoucher(v.id) && toast('ok', t('{id} 已过账，看板将在 15 分钟内刷新', { id: v.id }))}>{t('过账')}</Button>
          )}
          {v.status === '已过账' && !v.reversalOf && (
            <Button variant="danger" onClick={() => reverseVoucher(v.id)}>{t('红冲')}</Button>
          )}
          {v.status === '已过账' && <span className="self-center text-xs text-slate-500">{t('已过账凭证不可修改，只能红冲重记')}</span>}
        </div>
      </div>
    </Drawer>
  )
}

function OrderDrawer({ id, onClose, openVoucher, openOrder }: { id: string | null; onClose: () => void; openVoucher: (id: string) => void; openOrder: (id: string) => void }) {
  const { orders, vouchers, exceptions, generateForOrder } = useStore()
  const o = orders.find((x) => x.id === id)
  if (!o) return null
  const linked = vouchers.filter((v) => v.sourceDoc === o.id)
  const ex = exceptions.filter((e) => e.sourceDoc === o.id)
  const returns = orders.filter((x) => x.origOrder === o.id)
  const gross = o.amount - o.cost
  const contribution = gross - o.commission - o.ads - o.logistics - o.subsidy
  const events = ORDER_EVENTS[o.type]
  const triggered = triggeredEvents(o)
  const accts = new Set(linked.filter((v) => v.status !== '已冲销').flatMap((v) => v.lines.map((l) => l.account)))
  const rtnChecks = [
    [t('收入红冲'), accts.has('6001')],
    [t('成本回冲'), accts.has('6401')],
    [t('库存/损失'), accts.has('1405') || accts.has('1411') || accts.has('6711')],
    [t('税务红字'), o.tax === 0 || accts.has('2221')],
  ] as const

  return (
    <Drawer open onClose={onClose} title={<div className="flex items-center gap-3">{t('业务单据')} {o.id}<Badge tone="navy">{o.type === 'RTN' ? t('退件') : o.type}</Badge><Badge>{t(o.status)}</Badge></div>}>
      <div className="space-y-5">
        <Card>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Field label={t('单据日期')}>{o.date}</Field>
            <Field label={o.type === 'B2B' ? t('客户') : t('店铺')}>{orderParty(o)}</Field>
            <Field label={t('业务单元')}>{o.bu ? buName(o.bu) : <span className="text-loss">{t('缺失')}</span>}</Field>
            <Field label={t('项目')}>{projectName(o.project)}</Field>
            <Field label="SKU">{o.sku} · {skuName(o.sku)}</Field>
            <Field label={t('数量')}>{o.qty}</Field>
            {o.origOrder && <Field label={t('原订单')}><LinkText onClick={() => openOrder(o.origOrder!)}>{o.origOrder}</LinkText></Field>}
            {o.reason && <Field label={t('原因码 / 处置')}>{t(o.reason)} · {t(o.disposition ?? '')}</Field>}
          </div>
        </Card>

        <Card title={t('单据金额与利润拆解')}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-3">
            {[
              [t('不含税收入'), o.amount],
              [t('税额 / VAT'), o.tax],
              [t('销售成本'), -o.cost],
              [t('平台佣金'), -o.commission],
              [t('广告'), -o.ads],
              [t('物流履约'), -o.logistics],
              ...(o.subsidy ? [[t('促销补贴'), -o.subsidy] as [string, number]] : []),
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between border-b border-dashed border-slate-100 py-1">
                <span className="text-slate-500">{k}</span>
                <Money v={v as number} />
              </div>
            ))}
          </div>
          {o.type !== 'RTN' && (
            <div className="mt-4 flex gap-6 rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <span>{t('毛利')} <b className="num text-profit">{money(gross)}</b></span>
              <span>{t('贡献利润')} <b className={`num ${contribution >= 0 ? 'text-profit' : 'text-loss'}`}>{money(contribution)}</b></span>
              <span>{t('贡献利润率')} <b className="num">{((contribution / o.amount) * 100).toFixed(1)}%</b></span>
            </div>
          )}
        </Card>

        {o.type === 'RTN' && (
          <Card title={t('退件四项处理校验（收入 / 成本 / 库存 / 税）')}>
            <div className="flex flex-wrap gap-3">
              {rtnChecks.map(([k, ok]) => (
                <Badge key={k} tone={ok ? 'green' : 'red'}>{ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {k}</Badge>
              ))}
            </div>
          </Card>
        )}

        <Card
          title={<span className="inline-flex items-center gap-1.5"><Link2 size={15} />  {t('关联凭证（单据 → 凭证追溯）')}</span>}
          extra={<Button size="sm" onClick={() => generateForOrder(o.id)}>{t('生成凭证')}</Button>}
          pad={false}
        >
          <Table>
            <thead>
              <tr><Th>{t('业务事件')}</Th><Th>{t('凭证号')}</Th><Th>{t('期间')}</Th><Th>{t('状态')}</Th><Th right>{t('金额')}</Th></tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const vs = linked.filter((v) => !v.reversalOf && v.idemKey.startsWith(`${o.id}|${ev}|`))
                const e = ex.find((x) => x.event === ev)
                if (!vs.length)
                  return (
                    <tr key={ev}>
                      <Td>{t(ev)}</Td>
                      <Td colSpan={4}>
                        {e ? (
                          <Badge tone="red">{t('异常队列：')} {t(e.reason)}</Badge>
                        ) : triggered.includes(ev) ? (
                          <span className="text-xs text-amber-600">{t('已触发，未生成')}</span>
                        ) : (
                          <span className="text-xs text-slate-400">{t('未触发（单据状态：{status}）', { status: t(o.status) })}</span>
                        )}
                      </Td>
                    </tr>
                  )
                return vs.map((v) => (
                  <tr key={v.id}>
                    <Td>{t(ev)}</Td>
                    <Td><LinkText onClick={() => openVoucher(v.id)}>{v.id}</LinkText></Td>
                    <Td>{v.period}</Td>
                    <Td><StatusBadge status={v.status} /></Td>
                    <Td right><Money v={sum(v.lines, (l) => l.debit)} /></Td>
                  </tr>
                ))
              })}
              {linked.filter((v) => v.reversalOf || v.manual).map((v) => (
                <tr key={v.id}>
                  <Td>{t(v.event)}</Td>
                  <Td><LinkText onClick={() => openVoucher(v.id)}>{v.id}</LinkText></Td>
                  <Td>{v.period}</Td>
                  <Td><StatusBadge status={v.status} /></Td>
                  <Td right><Money v={sum(v.lines, (l) => l.debit)} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {returns.length > 0 && (
          <Card title={t('关联退件单')}>
            <div className="flex flex-wrap gap-2">
              {returns.map((r) => (
                <button key={r.id} onClick={() => openOrder(r.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:border-navy">
                  {r.id} · {t(r.reason ?? '')} · {t('{n} 件', { n: r.qty })}</button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </Drawer>
  )
}
