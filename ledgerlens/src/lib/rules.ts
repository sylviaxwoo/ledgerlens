import type { Aux, ExceptionReason, Order, OrderType, Voucher, VoucherLine } from '../data/types'
import { CLOSED_PERIODS, OPEN_PERIOD } from '../data/master'
import { t } from '../i18n'

export const ORDER_EVENTS: Record<OrderType, string[]> = {
  B2C: ['发货确认收入', '结转销售成本', '平台结算回款'],
  B2B: ['开票确认收入', '结转销售成本'],
  RTN: ['退货入库'],
}

const EVENT_TRIGGER: Record<string, string[]> = {
  发货确认收入: ['已发货', '已签收', '已结算'],
  平台结算回款: ['已结算'],
  开票确认收入: ['已开票'],
  结转销售成本: ['已发货', '已签收', '已结算', '已开票'],
  退货入库: ['已退款', '质检完成'],
}

/** 按单据当前状态，返回已触发的业务事件 */
export function triggeredEvents(o: Order): string[] {
  return ORDER_EVENTS[o.type].filter((ev) => EVENT_TRIGGER[ev].includes(o.status))
}

export type RuleRow = { event: string; debit: string; credit: string; aux: string; scope: string; version: string }

export const RULES: RuleRow[] = [
  { event: 'B2C 发货确认收入', debit: '1122.01 应收账款-平台', credit: '6001 主营业务收入 / 2221 应交税费', aux: '店铺、BU、SKU、项目', scope: 'BU-B2C, BU-LATAM', version: 'v3' },
  { event: '结转销售成本', debit: '6401 主营业务成本', credit: '1405 库存商品', aux: 'SKU、BU、项目', scope: '全部', version: 'v2' },
  { event: '平台结算回款', debit: '1002 银行存款 / 6601.01 佣金 / 6601.02 广告 / 6601.04 促销补贴', credit: '1122.01 应收账款-平台', aux: '店铺、BU', scope: 'BU-B2C, BU-LATAM', version: 'v4' },
  { event: 'B2B 开票确认收入', debit: '1122.02 应收账款-客户', credit: '6001 主营业务收入 / 2221 应交税费', aux: '客户、BU、项目', scope: 'BU-B2B, BU-LATAM', version: 'v2' },
  { event: '退货入库（二次销售）', debit: '1405 库存商品 / 6001 收入（红冲）/ 2221', credit: '6401 成本（红冲）/ 1122 应收', aux: 'SKU、BU', scope: '全部', version: 'v2' },
  { event: '退货入库（残次）', debit: '1411 残次品(NRV) / 6711 退货损失 / 6001 / 2221', credit: '6401 / 1122', aux: 'SKU、BU', scope: '全部', version: 'v1' },
  { event: '退货入库（报废/丢失）', debit: '6711 退货损失 / 6001 / 2221', credit: '6401 / 1122', aux: 'SKU、BU', scope: '全部', version: 'v1' },
  { event: '采购入库（暂估）', debit: '1405 库存商品', credit: '2202.99 应付暂估', aux: '供应商', scope: '全部', version: 'v1' },
  { event: '供应商发票匹配', debit: '2202.99 应付暂估 / 2221 进项', credit: '2202 应付账款', aux: '供应商', scope: '全部', version: 'v1' },
  { event: '付款核销', debit: '2202 应付账款', credit: '1002 银行存款', aux: '供应商', scope: '全部', version: 'v1' },
]

export const FEE_MAPPING = [
  { fee: '佣金', account: '6601.01 销售费用-佣金' },
  { fee: '广告', account: '6601.02 销售费用-广告' },
  { fee: '物流', account: '6601.03 销售费用-物流' },
  { fee: '支付手续费', account: '6601.01 销售费用-佣金' },
  { fee: '促销补贴', account: '6601.04 销售费用-促销补贴' },
]

export type EngineCtx = {
  orders: Order[]
  vouchers: Voucher[]
  subsidyMapped: boolean
  nextId: () => string
}

export type GenResult =
  | { kind: 'ok'; voucher: Voucher; notice?: string }
  | { kind: 'duplicate'; voucher: Voucher }
  | { kind: 'error'; reason: ExceptionReason; detail: string }

const L = (account: string, memo: string, debit: number, credit: number, aux: Aux): VoucherLine => ({
  account,
  memo,
  debit,
  credit,
  aux,
})

function buildLines(o: Order, event: string, ctx: EngineCtx): VoucherLine[] | { reason: ExceptionReason; detail: string } {
  const base: Aux = { bu: o.bu, project: o.project, sku: o.sku }
  const gross = o.amount + o.tax

  if (event === '发货确认收入') {
    return [
      L('1122.01', `${o.id} 平台应收`, gross, 0, { shop: o.channel, bu: o.bu }),
      L('6001', `${o.id} 销售收入`, 0, o.amount, { ...base, shop: o.channel }),
      ...(o.tax ? [L('2221', `${o.id} 销项税/VAT`, 0, o.tax, { bu: o.bu })] : []),
    ]
  }
  if (event === '开票确认收入') {
    return [
      L('1122.02', `${o.id} 客户应收`, gross, 0, { customer: o.customer, bu: o.bu, project: o.project }),
      L('6001', `${o.id} 销售收入`, 0, o.amount, base),
      L('2221', `${o.id} 销项税`, 0, o.tax, { bu: o.bu }),
    ]
  }
  if (event === '结转销售成本') {
    return [L('6401', `${o.id} 结转成本`, o.cost, 0, base), L('1405', `${o.id} 出库`, 0, o.cost, { sku: o.sku, bu: o.bu })]
  }
  if (event === '平台结算回款') {
    if (o.subsidy && !ctx.subsidyMapped) {
      return { reason: '科目映射缺失', detail: '平台费用类型「促销补贴」未配置科目映射' }
    }
    const net = gross - o.commission - o.ads - o.subsidy
    const aux: Aux = { shop: o.channel, bu: o.bu }
    return [
      L('1002', `${o.id} 平台回款`, net, 0, {}),
      L('6601.01', `${o.id} 平台佣金`, o.commission, 0, aux),
      ...(o.ads ? [L('6601.02', `${o.id} 站内广告`, o.ads, 0, { ...aux, project: o.project })] : []),
      ...(o.subsidy ? [L('6601.04', `${o.id} 促销补贴`, o.subsidy, 0, aux)] : []),
      L('1122.01', `${o.id} 冲平台应收`, 0, gross, aux),
    ]
  }
  if (event === '退货入库') {
    const orig = ctx.orders.find((x) => x.id === o.origOrder)
    const arAcc = orig?.type === 'B2B' ? '1122.02' : '1122.01'
    const auxR: Aux = orig?.type === 'B2B' ? { ...base, customer: orig.customer } : { ...base, shop: o.channel }
    const lines: VoucherLine[] = [
      L('6001', `${o.id} 红冲收入`, o.amount, 0, auxR),
      ...(o.tax ? [L('2221', `${o.id} 红字发票/VAT`, o.tax, 0, { bu: o.bu })] : []),
      L(arAcc, `${o.id} 冲减应收/退款`, 0, o.amount + o.tax, orig?.type === 'B2B' ? { customer: orig.customer, bu: o.bu } : { shop: o.channel, bu: o.bu }),
    ]
    const d = o.disposition
    if (d === '二次销售') {
      lines.push(L('1405', `${o.id} 退货回库存`, o.cost, 0, { sku: o.sku, bu: o.bu }))
    } else if (d === '残次') {
      const nrv = o.nrv ?? 0
      lines.push(L('1411', `${o.id} 残次仓(可变现净值)`, nrv, 0, { sku: o.sku }))
      lines.push(L('6711', `${o.id} 残次差额损失`, o.cost - nrv, 0, base))
    } else {
      lines.push(L('6711', `${o.id} ${d === '丢失' ? '丢失损失(待索赔)' : '报废损失'}`, o.cost, 0, base))
    }
    lines.push(L('6401', `${o.id} 成本回冲`, 0, o.cost, base))
    return lines
  }
  return { reason: '科目映射缺失', detail: `事件「${event}」未配置凭证规则` }
}

export function generateVoucher(o: Order, event: string, ctx: EngineCtx, version = 1): GenResult {
  const idemKey = `${o.id}|${event}|v${version}`
  const existing = ctx.vouchers.find((v) => v.idemKey === idemKey)
  if (existing) return { kind: 'duplicate', voucher: existing }

  if (!o.bu) {
    return { kind: 'error', reason: '必填维度缺失', detail: '凭证行缺少必填维度「业务单元(BU)」，不允许过账' }
  }

  const built = buildLines(o, event, ctx)
  if (!Array.isArray(built)) return { kind: 'error', ...built }

  const dr = built.reduce((a, l) => a + l.debit, 0)
  const cr = built.reduce((a, l) => a + l.credit, 0)
  if (dr !== cr) {
    return { kind: 'error', reason: '借贷不平', detail: `借方 ${dr / 100} ≠ 贷方 ${cr / 100}` }
  }

  let period = o.date.slice(0, 7)
  let date = o.date
  let notice: string | undefined
  if (CLOSED_PERIODS.includes(period)) {
    notice = t('期间 {period} 已结账，凭证已自动顺延至当前开放期间 {open}', { period, open: OPEN_PERIOD })
    period = OPEN_PERIOD
    date = `${OPEN_PERIOD}-01`
  }

  return {
    kind: 'ok',
    notice,
    voucher: {
      id: ctx.nextId(),
      period,
      date,
      event: `${o.type === 'RTN' ? '退件' : o.type} ${event}${o.disposition ? `（${o.disposition}）` : ''}`,
      sourceDoc: o.id,
      idemKey,
      lines: built,
      status: '待审核',
      maker: '规则引擎',
    },
  }
}
