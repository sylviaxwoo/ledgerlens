import type { ApItem, ArItem, BankReceipt, Disposition, Order, SettlementLine, Shop } from './types'
import { shops, skus } from './master'
import { yuan } from '../lib/format'

const TAX_RATE: Record<string, number> = { 'TM-FLG': 0.13, 'TTS-MX': 0.16 }
const ADS_RATE: Record<string, number> = { 'AMZ-US': 0.08, 'TTS-MX': 0.12, 'SHP-MY': 0.05 }

function b2c(
  id: string,
  date: string,
  shopCode: string,
  sku: string,
  qty: number,
  status: string,
  extra: Partial<Order> = {},
): Order {
  const shop = shops.find((s) => s.code === shopCode) as Shop
  const item = skus.find((s) => s.sku === sku)!
  const amount = yuan(item.price * qty)
  return {
    id,
    type: 'B2C',
    date,
    channel: shopCode,
    customer: shop.platform,
    bu: shop.bu,
    sku,
    qty,
    amount,
    tax: Math.round(amount * (TAX_RATE[shopCode] ?? 0)),
    cost: yuan(item.cost * qty),
    commission: Math.round(amount * shop.commissionRate),
    ads: Math.round(amount * (ADS_RATE[shopCode] ?? 0)),
    logistics: yuan(18 * qty),
    subsidy: 0,
    status,
    ...extra,
  }
}

function b2b(
  id: string,
  date: string,
  customer: string,
  bu: string,
  sku: string,
  qty: number,
  discount: number,
  status: string,
  extra: Partial<Order> = {},
): Order {
  const item = skus.find((s) => s.sku === sku)!
  const amount = yuan(item.price * qty * (1 - discount))
  return {
    id,
    type: 'B2B',
    date,
    channel: '合同直销',
    customer,
    bu,
    sku,
    qty,
    amount,
    tax: Math.round(amount * 0.13),
    cost: yuan(item.cost * qty),
    commission: 0,
    ads: 0,
    logistics: yuan(6 * qty),
    subsidy: 0,
    status,
    ...extra,
  }
}

function rtn(
  id: string,
  date: string,
  orig: Order,
  qty: number,
  reason: string,
  disposition: Disposition,
  status: string,
  nrvPerUnit = 0,
): Order {
  const ratio = qty / orig.qty
  return {
    id,
    type: 'RTN',
    date,
    channel: orig.channel,
    customer: orig.customer,
    bu: orig.bu,
    project: orig.project,
    sku: orig.sku,
    qty,
    amount: Math.round(orig.amount * ratio),
    tax: Math.round(orig.tax * ratio),
    cost: Math.round(orig.cost * ratio),
    commission: -Math.round(orig.commission * ratio),
    ads: 0,
    logistics: yuan(25 * qty),
    subsidy: 0,
    status,
    origOrder: orig.id,
    reason,
    disposition,
    nrv: yuan(nrvPerUnit * qty),
  }
}

const o = {
  b2c0901: b2c('SO-B2C-260901', '2026-09-28', 'AMZ-US', 'SKU-A100', 40, '已结算'),
  b2c0902: b2c('SO-B2C-260902', '2026-09-30', 'TM-FLG', 'SKU-C310', 25, '已签收'),
  b2c1001: b2c('SO-B2C-261001', '2026-10-02', 'TTS-MX', 'SKU-B220', 120, '已结算', { project: 'PRJ-TT' }),
  b2c1002: b2c('SO-B2C-261002', '2026-10-03', 'AMZ-US', 'SKU-E580', 15, '已结算'),
  b2c1003: b2c('SO-B2C-261003', '2026-10-05', 'SHP-MY', 'SKU-B220', 60, '已结算', { subsidy: yuan(820) }),
  b2c1004: b2c('SO-B2C-261004', '2026-10-08', 'DTC-WEB', 'SKU-D450', 10, '已结算', { project: 'PRJ-WH' }),
  b2c1005: b2c('SO-B2C-261005', '2026-10-09', 'TM-FLG', 'SKU-A100', 80, '已结算', { project: 'PRJ-WH' }),
  b2c1006: b2c('SO-B2C-261006', '2026-10-11', 'TTS-MX', 'SKU-A100', 50, '已发货', { project: 'PRJ-TT', bu: undefined }),
  b2c1007: b2c('SO-B2C-261007', '2026-10-14', 'AMZ-US', 'SKU-C310', 30, '已发货'),
  b2c1008: b2c('SO-B2C-261008', '2026-10-16', 'TTS-MX', 'SKU-E580', 8, '已发货', { project: 'PRJ-TT' }),
  b2b0915: b2b('SO-B2B-260915', '2026-09-15', 'C-HL', 'BU-B2B', 'SKU-D450', 120, 0.18, '已开票'),
  b2b1003: b2b('SO-B2B-261003', '2026-10-03', 'C-MJ', 'BU-B2B', 'SKU-C310', 200, 0.15, '已开票'),
  b2b1007: b2b('SO-B2B-261007', '2026-10-07', 'C-GA', 'BU-LATAM', 'SKU-E580', 60, 0.12, '已开票', { project: 'PRJ-MX' }),
  b2b1012: b2b('SO-B2B-261012', '2026-10-12', 'C-HL', 'BU-B2B', 'SKU-A100', 300, 0.2, '已发货'),
  b2b1015: b2b('SO-B2B-261015', '2026-10-15', 'C-XD', 'BU-B2B', 'SKU-B220', 500, 0.25, '信用冻结'),
}

export const seedOrders: Order[] = [
  ...Object.values(o),
  rtn('RT-261004', '2026-10-04', o.b2c0901, 3, '质量问题', '二次销售', '已退款'),
  rtn('RT-261009', '2026-10-09', o.b2c1002, 1, '运输损坏', '残次', '已退款', 600),
  rtn('RT-261013', '2026-10-13', o.b2c1003, 5, '七天无理由', '二次销售', '已退款'),
  rtn('RT-261016', '2026-10-16', o.b2b1003, 10, '质量问题', '报废', '质检完成'),
  rtn('RT-261017', '2026-10-17', o.b2c1005, 2, '物流丢失', '丢失', '待处置'),
]

/** 初始化时自动生成凭证的单据（其余保留给演示「生成凭证」操作） */
export const seedGenerated = [
  'SO-B2C-260901',
  'SO-B2C-261001',
  'SO-B2C-261002',
  'SO-B2C-261003',
  'SO-B2C-261004',
  'SO-B2C-261005',
  'SO-B2C-261006',
  'SO-B2B-260915',
  'SO-B2B-261003',
  'SO-B2B-261007',
  'RT-261004',
  'RT-261009',
  'RT-261013',
]

export const seedArItems: ArItem[] = [
  { id: 'AR-0712', customer: 'C-HL', doc: 'SO-B2B-260712', bu: 'BU-B2B', date: '2026-07-12', due: '2026-09-10', amount: yuan(286_400), settled: yuan(120_000) },
  { id: 'AR-0803', customer: 'C-XD', doc: 'SO-B2B-260803', bu: 'BU-B2B', date: '2026-06-03', due: '2026-07-03', amount: yuan(158_200), settled: 0 },
  { id: 'AR-0821', customer: 'C-MJ', doc: 'SO-B2B-260821', bu: 'BU-B2B', date: '2026-08-21', due: '2026-10-05', amount: yuan(132_600), settled: 0 },
  { id: 'AR-0915', customer: 'C-HL', doc: 'SO-B2B-260915', bu: 'BU-B2B', date: '2026-09-15', due: '2026-11-14', amount: yuan(144_995.04), settled: 0 },
  { id: 'AR-0918', customer: 'C-GA', doc: 'SO-B2B-260918', bu: 'BU-LATAM', project: 'PRJ-MX', date: '2026-08-18', due: '2026-09-17', amount: yuan(96_800), settled: yuan(40_000) },
  { id: 'AR-1003', customer: 'C-MJ', doc: 'SO-B2B-261003', bu: 'BU-B2B', date: '2026-10-03', due: '2026-11-17', amount: yuan(134_249.5), settled: 0 },
  { id: 'AR-1007', customer: 'C-GA', doc: 'SO-B2B-261007', bu: 'BU-LATAM', project: 'PRJ-MX', date: '2026-10-07', due: '2026-11-06', amount: yuan(130_587.36), settled: 0 },
  { id: 'AR-P-AMZ', customer: 'C-AMZ', doc: '平台待结算 2026-10 W2', bu: 'BU-B2C', date: '2026-10-10', due: '2026-10-24', amount: yuan(68_420), settled: 0 },
  { id: 'AR-P-TTS', customer: 'C-TTS', doc: '平台待结算 2026-10 W2', bu: 'BU-LATAM', project: 'PRJ-TT', date: '2026-10-11', due: '2026-10-19', amount: yuan(41_760), settled: 0 },
]

export const seedReceipts: BankReceipt[] = [
  { id: 'BK-10121', date: '2026-10-12', payer: '华联商贸有限公司', amount: yuan(200_000), ref: 'SO-B2B-260712/260915 货款' },
  { id: 'BK-10142', date: '2026-10-14', payer: 'Grupo Azteca Retail', amount: yuan(56_800), ref: 'INV AR-0918 saldo' },
  { id: 'BK-10155', date: '2026-10-15', payer: '美嘉零售集团', amount: yuan(280_000), ref: '8-10月货款（含预付）' },
  { id: 'BK-10171', date: '2026-10-17', payer: '未知付款方 *6621', amount: yuan(12_000), ref: '无附言' },
]

export const seedApItems: ApItem[] = [
  { id: 'AP-2601', supplier: 'S-YX', source: '采购订单', bu: 'BU-B2C', po: yuan(420_000), receipt: yuan(420_000), invoice: yuan(420_000), date: '2026-09-20', due: '2026-11-04', paid: 0, status: '已匹配' },
  { id: 'AP-2602', supplier: 'S-YX', source: '采购订单', bu: 'BU-B2B', po: yuan(318_000), receipt: yuan(301_000), invoice: yuan(318_000), date: '2026-10-02', due: '2026-11-16', paid: 0, status: '匹配异常' },
  { id: 'AP-2603', supplier: 'S-HK', source: '采购订单', bu: 'BU-LATAM', project: 'PRJ-MX', po: yuan(260_000), receipt: yuan(260_000), invoice: yuan(261_800), date: '2026-10-05', due: '2026-12-04', paid: 0, status: '待匹配' },
  { id: 'AP-2604', supplier: 'S-SF', source: '物流费', bu: 'BU-B2C', po: yuan(48_600), receipt: yuan(48_600), invoice: yuan(48_600), date: '2026-09-30', due: '2026-10-30', paid: 0, status: '已申请付款' },
  { id: 'AP-2605', supplier: 'S-CN', source: '仓储费', bu: 'BU-B2C', project: 'PRJ-WH', po: yuan(86_000), receipt: yuan(86_000), invoice: yuan(86_000), date: '2026-10-01', due: '2026-10-31', paid: 0, status: '已匹配' },
  { id: 'AP-2606', supplier: 'S-TT', source: '广告费', bu: 'BU-LATAM', project: 'PRJ-TT', po: yuan(120_000), receipt: yuan(120_000), invoice: yuan(120_000), date: '2026-10-08', due: '2026-10-23', paid: 0, status: '已匹配' },
  { id: 'AP-2607', supplier: 'S-DEV', source: '外包结算', bu: 'GRP', project: 'PRJ-ERP', po: yuan(150_000), receipt: yuan(150_000), invoice: yuan(150_000), date: '2026-09-25', due: '2026-10-25', paid: yuan(150_000), status: '已付款' },
  { id: 'AP-2608', supplier: 'S-SF', source: '物流费', bu: 'BU-LATAM', po: yuan(32_400), receipt: yuan(32_400), invoice: yuan(33_900), date: '2026-10-10', due: '2026-11-09', paid: 0, status: '待匹配' },
]

export const seedSettlements: SettlementLine[] = [
  { id: 'ST-01', shop: 'AMZ-US', order: 'SO-B2C-260901', expected: yuan(14_371), received: yuan(14_371), status: '已匹配' },
  { id: 'ST-02', shop: 'AMZ-US', order: 'SO-B2C-261002', expected: yuan(25_397.45), received: yuan(25_397.45), status: '已匹配' },
  { id: 'ST-03', shop: 'TTS-MX', order: 'SO-B2C-261001', expected: yuan(35_165.96), received: yuan(34_806.38), diffType: '费率差异', status: '差异' },
  { id: 'ST-04', shop: 'SHP-MY', order: 'SO-B2C-261003', expected: yuan(14_830.2), received: yuan(14_010.2), diffType: '扣款', status: '差异' },
  { id: 'ST-05', shop: 'TM-FLG', order: 'SO-B2C-261005', expected: yuan(42_986.28), received: yuan(42_986.28), status: '已匹配' },
  { id: 'ST-06', shop: 'DTC-WEB', order: 'SO-B2C-261004', expected: yuan(12_613.29), received: yuan(12_613.29), status: '已匹配' },
  { id: 'ST-07', shop: 'AMZ-US', order: 'SO-B2C-260918', expected: yuan(9_820), received: yuan(9_820), status: '已匹配' },
  { id: 'ST-08', shop: 'AMZ-US', order: 'SO-B2C-260922', expected: yuan(7_416), received: yuan(7_416), status: '已匹配' },
  { id: 'ST-09', shop: 'TTS-MX', order: 'SO-B2C-261006', expected: yuan(26_017.6), received: 0, diffType: '延迟', status: '差异' },
  { id: 'ST-10', shop: 'AMZ-US', order: '（结算单无对应订单）', expected: 0, received: yuan(1_250), diffType: '保证金', status: '未匹配' },
  { id: 'ST-11', shop: 'TM-FLG', order: 'SO-B2C-260925', expected: yuan(18_960), received: yuan(18_960), status: '已匹配' },
  { id: 'ST-12', shop: 'SHP-MY', order: 'SO-B2C-260927', expected: yuan(6_240), received: yuan(6_240), status: '已匹配' },
]
