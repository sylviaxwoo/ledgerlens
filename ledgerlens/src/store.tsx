import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import type { ApItem, ArItem, BankReceipt, Order, Voucher, VoucherException, VoucherLine } from './data/types'
import { seedApItems, seedArItems, seedGenerated, seedOrders, seedReceipts } from './data/seed'
import { customers, OPEN_PERIOD, TODAY } from './data/master'
import { generateVoucher, triggeredEvents, type EngineCtx } from './lib/rules'
import { yuan } from './lib/format'
import { getLang, setLang as setGlobalLang, t, type Lang } from './i18n'

export type Role = { name: string; title: string; canApprove: boolean }
export const ROLES: Role[] = [
  { name: 'Robin', title: '总账会计', canApprove: false },
  { name: 'Tim', title: '财务总监', canApprove: true },
  { name: 'Kelly', title: 'CFO', canApprove: true },
]

type Toast = { id: number; tone: 'ok' | 'warn' | 'err' | 'info'; text: string }

let seq = 1000
const nextId = () => `JZ-26-${++seq}`

function manual(date: string, event: string, doc: string, lines: VoucherLine[], status: Voucher['status'], maker = 'Robin'): Voucher {
  return { id: nextId(), period: date.slice(0, 7), date, event, sourceDoc: doc, idemKey: `${doc}|manual|v1`, lines, status, maker, manual: true, reviewer: status === '已过账' ? 'Tim' : undefined }
}

function buildSeed() {
  const vouchers: Voucher[] = []
  const exceptions: VoucherException[] = []
  let exSeq = 1
  for (const id of seedGenerated) {
    const o = seedOrders.find((x) => x.id === id)!
    for (const ev of triggeredEvents(o)) {
      const ctx: EngineCtx = { orders: seedOrders, vouchers, subsidyMapped: false, nextId }
      const r = generateVoucher({ ...o, date: o.date }, ev, ctx)
      if (r.kind === 'ok') {
        const v = { ...r.voucher, period: o.date.slice(0, 7), date: o.date }
        v.status = o.date <= '2026-10-09' ? '已过账' : o.date <= '2026-10-12' ? '已审核' : '待审核'
        if (v.status !== '待审核') v.reviewer = 'Tim'
        vouchers.push(v)
      } else if (r.kind === 'error') {
        exceptions.push({ id: `EX-${String(exSeq++).padStart(3, '0')}`, sourceDoc: o.id, event: ev, reason: r.reason, detail: r.detail, time: `${o.date} 09:${10 + exSeq}` })
      }
    }
  }
  vouchers.push(
    manual('2026-10-01', '手工 仓储租金计提', 'AP-2605', [
      { account: '6601.03', memo: '东莞新仓 10 月仓储费', debit: yuan(86_000), credit: 0, aux: { bu: 'BU-B2C', project: 'PRJ-WH' } },
      { account: '2202', memo: '菜鸟海外仓', debit: 0, credit: yuan(86_000), aux: { supplier: 'S-CN' } },
    ], '已过账'),
    manual('2026-10-02', '采购入库（暂估）', 'GR-261002', [
      { account: '1405', memo: '耳机/手环补货入库', debit: yuan(420_000), credit: 0, aux: { bu: 'BU-B2C', sku: 'SKU-A100' } },
      { account: '2202.99', memo: '东莞优选制造 暂估', debit: 0, credit: yuan(420_000), aux: { supplier: 'S-YX' } },
    ], '已过账'),
    manual('2026-10-08', '手工 广告费入账', 'AP-2606', [
      { account: '6601.02', memo: 'TikTok Ads 10 月上半月投放', debit: yuan(120_000), credit: 0, aux: { bu: 'BU-LATAM', project: 'PRJ-TT', shop: 'TTS-MX' } },
      { account: '2202', memo: 'TikTok Ads', debit: 0, credit: yuan(120_000), aux: { supplier: 'S-TT' } },
    ], '已过账'),
    manual('2026-10-15', '手工 外包开发费', 'AP-2609', [
      { account: '6602', memo: '业财系统 10 月外包开发', debit: yuan(46_000), credit: 0, aux: { bu: 'GRP', project: 'PRJ-ERP' } },
      { account: '2202', memo: '云栈软件外包', debit: 0, credit: yuan(46_000), aux: { supplier: 'S-DEV' } },
    ], '待审核'),
  )
  return { vouchers, exceptions, exSeq }
}

type Store = {
  lang: Lang
  setLang: (l: Lang) => void
  role: Role
  setRole: (r: Role) => void
  orders: Order[]
  vouchers: Voucher[]
  exceptions: VoucherException[]
  subsidyMapped: boolean
  arItems: ArItem[]
  receipts: BankReceipt[]
  apItems: ApItem[]
  periodClosed: boolean
  toasts: Toast[]
  toast: (tone: Toast['tone'], text: string) => void
  generateForOrder: (orderId: string) => void
  retryException: (exId: string) => void
  fixOrderBu: (orderId: string, bu: string) => void
  mapSubsidy: () => void
  reviewVoucher: (id: string) => boolean
  postVoucher: (id: string) => boolean
  reverseVoucher: (id: string) => void
  addManualVoucher: (v: Omit<Voucher, 'id' | 'status' | 'maker' | 'idemKey'>) => void
  autoMatchReceipts: () => void
  runThreeWayMatch: (id: string) => void
  approveApException: (id: string) => void
  requestPayment: (id: string) => void
  approveB2BCredit: (orderId: string) => void
  closePeriod: () => void
  reopenPeriod: () => void
}

const Ctx = createContext<Store | null>(null)
const SEED = buildSeed()

export function StoreProvider({ children }: { children: ReactNode }) {
  const seed = SEED
  const exSeq = useRef(seed.exSeq)
  const toastSeq = useRef(0)
  const [lang, setLangState] = useState<Lang>(getLang())
  const [role, setRole] = useState<Role>(ROLES[0])
  const [orders, setOrders] = useState<Order[]>(seedOrders)
  const [vouchers, setVouchers] = useState<Voucher[]>(seed.vouchers)
  const [exceptions, setExceptions] = useState<VoucherException[]>(seed.exceptions)
  const [subsidyMapped, setSubsidyMapped] = useState(false)
  const [arItems, setArItems] = useState<ArItem[]>(seedArItems)
  const [receipts, setReceipts] = useState<BankReceipt[]>(seedReceipts)
  const [apItems, setApItems] = useState<ApItem[]>(seedApItems)
  const [periodClosed, setPeriodClosed] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const setLang = useCallback((l: Lang) => {
    setGlobalLang(l)
    setLangState(l)
    setToasts([])
  }, [])

  const toast = useCallback((tone: Toast['tone'], text: string) => {
    const id = ++toastSeq.current
    setToasts((xs) => [...xs, { id, tone, text }])
    setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), 4200)
  }, [])

  const runEvents = useCallback(
    (o: Order, events: string[], opts: { subsidyMapped: boolean }) => {
      const created: Voucher[] = []
      const errors: VoucherException[] = []
      const dups: Voucher[] = []
      const notices = new Set<string>()
      const pool = [...vouchers]
      for (const ev of events) {
        const r = generateVoucher(o, ev, { orders, vouchers: pool, subsidyMapped: opts.subsidyMapped, nextId })
        if (r.kind === 'ok') {
          created.push(r.voucher)
          pool.push(r.voucher)
          if (r.notice) notices.add(r.notice)
        } else if (r.kind === 'duplicate') dups.push(r.voucher)
        else
          errors.push({
            id: `EX-${String(exSeq.current++).padStart(3, '0')}`,
            sourceDoc: o.id,
            event: ev,
            reason: r.reason,
            detail: r.detail,
            time: `${TODAY} ${new Date().toTimeString().slice(0, 5)}`,
          })
      }
      return { created, errors, dups, notices: [...notices] }
    },
    [orders, vouchers],
  )

  const generateForOrder = useCallback(
    (orderId: string) => {
      const o = orders.find((x) => x.id === orderId)
      if (!o) return
      if (o.status === '信用冻结') {
        toast('err', t('{id} 超出客户信用额度，需财务总监或 CFO 审批后才能发货与开票', { id: o.id }))
        return
      }
      const events = triggeredEvents(o)
      if (!events.length) {
        toast('info', t('{id} 当前状态「{status}」尚未触发需记账的业务事件', { id: o.id, status: t(o.status) }))
        return
      }
      const { created, errors, dups, notices } = runEvents(o, events, { subsidyMapped })
      if (created.length) setVouchers((v) => [...v, ...created])
      if (errors.length) {
        setExceptions((ex) => [
          ...ex,
          ...errors.filter((e) => !ex.some((x) => x.sourceDoc === e.sourceDoc && x.event === e.event)),
        ])
      }
      if (created.length) toast('ok', t('已生成 {n} 张凭证：{ids}', { n: created.length, ids: created.map((v) => v.id).join(', ') }))
      if (dups.length) toast('info', t('幂等控制：{ids} 已存在（单据号+事件+版本），未重复生成', { ids: dups.map((v) => v.id).join(', ') }))
      notices.forEach((n) => toast('warn', n))
      if (errors.length) toast('err', t('{n} 个事件进入异常队列：{reason}', { n: errors.length, reason: t(errors[0].reason) }))
    },
    [orders, runEvents, subsidyMapped, toast],
  )

  const retryException = useCallback(
    (exId: string) => {
      const ex = exceptions.find((e) => e.id === exId)
      if (!ex) return
      const o = orders.find((x) => x.id === ex.sourceDoc)!
      const { created, errors, dups } = runEvents(o, [ex.event], { subsidyMapped })
      if (created.length || dups.length) {
        setVouchers((v) => [...v, ...created])
        setExceptions((list) => list.filter((e) => e.id !== exId))
        toast('ok', created.length ? t('重推成功，生成凭证 {id}', { id: created[0].id }) : t('凭证已存在，异常已关闭'))
      } else {
        toast('err', t('重推失败：{detail}', { detail: t(errors[0]?.detail ?? '') }))
      }
    },
    [exceptions, orders, runEvents, subsidyMapped, toast],
  )

  const fixOrderBu = useCallback(
    (orderId: string, bu: string) => {
      setOrders((os) => os.map((o) => (o.id === orderId ? { ...o, bu } : o)))
      toast('ok', t('{id} 已补充业务单元标签，可重推生成凭证', { id: orderId }))
    },
    [toast],
  )

  const mapSubsidy = useCallback(() => {
    setSubsidyMapped(true)
    toast('ok', t('已配置映射：促销补贴 → 6601.04 销售费用-促销补贴'))
  }, [toast])

  const reviewVoucher = useCallback(
    (id: string) => {
      const v = vouchers.find((x) => x.id === id)
      if (!v || v.status !== '待审核') return false
      if (v.maker === role.name) {
        toast('err', t('不相容职责控制：制单人与审核人不能为同一人（{name}）', { name: role.name }))
        return false
      }
      setVouchers((vs) => vs.map((x) => (x.id === id ? { ...x, status: '已审核', reviewer: role.name } : x)))
      return true
    },
    [role, toast, vouchers],
  )

  const postVoucher = useCallback(
    (id: string) => {
      const v = vouchers.find((x) => x.id === id)
      if (!v || v.status !== '已审核') return false
      setVouchers((vs) => vs.map((x) => (x.id === id ? { ...x, status: '已过账' } : x)))
      return true
    },
    [vouchers],
  )

  const reverseVoucher = useCallback(
    (id: string) => {
      const v = vouchers.find((x) => x.id === id)
      if (!v || v.status !== '已过账') return
      if (!role.canApprove) {
        toast('err', t('红冲需财务总监或 CFO 权限，请切换角色'))
        return
      }
      const rid = nextId()
      const rev: Voucher = {
        id: rid,
        period: OPEN_PERIOD,
        date: TODAY,
        event: `红冲 ${v.event}`,
        sourceDoc: v.sourceDoc,
        idemKey: `${v.idemKey}|reversal`,
        lines: v.lines.map((l) => ({ ...l, memo: `红冲 ${l.memo}`, debit: -l.debit, credit: -l.credit })),
        status: '已过账',
        maker: role.name,
        reviewer: role.name,
        reversalOf: v.id,
      }
      setVouchers((vs) => [...vs.map((x) => (x.id === id ? { ...x, status: '已冲销' as const, reversedBy: rid } : x)), rev])
      toast('ok', t('已生成红字冲销凭证 {rid}，与原凭证 {id} 互相关联', { rid, id: v.id }))
    },
    [role, toast, vouchers],
  )

  const addManualVoucher = useCallback(
    (v: Omit<Voucher, 'id' | 'status' | 'maker' | 'idemKey'>) => {
      const id = nextId()
      setVouchers((vs) => [...vs, { ...v, id, status: '待审核', maker: role.name, idemKey: `${id}|manual|v1`, manual: true }])
      toast('ok', t('手工凭证 {id} 已提交审核（制单人：{name}）', { id, name: role.name }))
    },
    [role, toast],
  )

  const autoMatchReceipts = useCallback(() => {
    const items = arItems.map((a) => ({ ...a }))
    let matchedCount = 0
    const next = receipts.map((r) => {
      if (r.matched) return r
      const cust = customers.find((c) => c.name === r.payer)
      if (!cust) return r
      let left = r.amount
      const matched: { arId: string; amount: number }[] = []
      for (const a of items.filter((x) => x.customer === cust.code).sort((x, y) => x.date.localeCompare(y.date))) {
        const open = a.amount - a.settled
        if (open <= 0 || left <= 0) continue
        const take = Math.min(open, left)
        a.settled += take
        left -= take
        matched.push({ arId: a.id, amount: take })
      }
      if (!matched.length) return r
      matchedCount++
      return { ...r, matched, prepaid: left > 0 ? left : undefined }
    })
    setArItems(items)
    setReceipts(next)
    const total = next.length
    const ok = next.filter((r) => r.matched).length
    toast(matchedCount ? 'ok' : 'info', t('自动核销完成：本次匹配 {n} 笔，匹配率 {rate}%，未识别款项保留待人工处理', { n: matchedCount, rate: Math.round((ok / total) * 100) }))
  }, [arItems, receipts, toast])

  const runThreeWayMatch = useCallback(
    (id: string) => {
      const a = apItems.find((x) => x.id === id)
      if (!a) return
      const tol = 0.005
      const okInv = Math.abs(a.invoice - a.po) / a.po <= tol
      const okRcv = Math.abs(a.receipt - a.po) / a.po <= tol
      const status: ApItem['status'] = okInv && okRcv ? '已匹配' : '匹配异常'
      setApItems((list) => list.map((x) => (x.id === id ? { ...x, status } : x)))
      if (status === '已匹配') toast('ok', t('{id} 三单匹配通过', { id }))
      else toast('err', t('{id} 三单匹配不一致：差异超出 0.5% 容差，不能发起付款', { id }))
    },
    [apItems, toast],
  )

  const approveApException = useCallback(
    (id: string) => {
      if (!role.canApprove) {
        toast('err', t('例外审批需财务总监或 CFO 权限'))
        return
      }
      setApItems((l) => l.map((a) => (a.id === id ? { ...a, status: '已匹配' } : a)))
      toast('ok', t('{id} 已由 {name} 审批例外，允许进入付款申请', { id, name: role.name }))
    },
    [role, toast],
  )

  const requestPayment = useCallback(
    (id: string) => {
      const a = apItems.find((x) => x.id === id)
      if (a?.status !== '已匹配') {
        toast('err', t('三单匹配未通过，不允许进入付款申请'))
        return
      }
      setApItems((l) => l.map((x) => (x.id === id ? { ...x, status: '已申请付款' } : x)))
      toast('ok', t('{id} 已提交付款申请，按账期排入付款计划', { id }))
    },
    [apItems, toast],
  )

  const approveB2BCredit = useCallback(
    (orderId: string) => {
      if (!role.canApprove) {
        toast('err', t('超信用额度审批需财务总监或 CFO 权限'))
        return
      }
      setOrders((os) => os.map((o) => (o.id === orderId ? { ...o, status: '已开票' } : o)))
      toast('ok', t('{id} 信用例外已审批，可发货开票', { id: orderId }))
    },
    [role, toast],
  )

  const closePeriod = useCallback(() => {
    setPeriodClosed(true)
    toast('ok', t('{period} 已结账，项目 ROI 快照已保存', { period: OPEN_PERIOD }))
  }, [toast])

  const reopenPeriod = useCallback(() => {
    if (!role.canApprove) {
      toast('err', t('反结账需财务总监或 CFO 审批'))
      return
    }
    setPeriodClosed(false)
    toast('warn', t('{period} 已反结账（审批人 {name}，已留痕），下游期初余额将重算', { period: OPEN_PERIOD, name: role.name }))
  }, [role, toast])

  const value: Store = {
    lang, setLang, role, setRole, orders, vouchers, exceptions, subsidyMapped, arItems, receipts, apItems, periodClosed, toasts, toast,
    generateForOrder, retryException, fixOrderBu, mapSubsidy, reviewVoucher, postVoucher, reverseVoucher, addManualVoucher,
    autoMatchReceipts, runThreeWayMatch, approveApException, requestPayment, approveB2BCredit, closePeriod, reopenPeriod,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider missing')
  return s
}
