import type { Account, BU, Customer, Entity, Project, Shop, Sku, Supplier } from './types'
import { yuan } from '../lib/format'
import { t } from '../i18n'

export const TODAY = '2026-10-18'
export const OPEN_PERIOD = '2026-10'
export const CLOSED_PERIODS = ['2026-07', '2026-08', '2026-09']

export const entities: Entity[] = [
  { code: 'CN01', name: '深圳镜账科技有限公司', country: '中国', taxId: '91440300MA5F****8X', currency: 'CNY', gaap: '企业会计准则', bank: '招商银行深圳分行' },
  { code: 'US01', name: 'LedgerLens Commerce Inc.', country: '美国', taxId: 'EIN 88-***4521', currency: 'USD', gaap: 'US GAAP', bank: 'Chase Bank' },
  { code: 'MX01', name: 'LedgerLens México S.A. de C.V.', country: '墨西哥', taxId: 'RFC LLM2****A3', currency: 'MXN', gaap: 'NIF', bank: 'BBVA México' },
]

export const bus: BU[] = [
  { code: 'GRP', name: '集团', type: '集团', owner: '周总', entity: 'CN01', since: '2022-01-01' },
  { code: 'BU-B2C', name: '电商零售', type: 'B2C', parent: 'GRP', owner: '陈晓', entity: 'CN01', since: '2022-01-01' },
  { code: 'BU-B2B', name: '企业客户', type: 'B2B', parent: 'GRP', owner: '王磊', entity: 'CN01', since: '2022-06-01' },
  { code: 'BU-RTN', name: '逆向退件', type: '逆向退件', parent: 'GRP', owner: '刘敏', entity: 'CN01', since: '2023-03-01' },
  { code: 'BU-LATAM', name: '拉美市场', type: '区域', parent: 'GRP', owner: 'Carlos R.', entity: 'MX01', since: '2025-11-01' },
]

export const projects: Project[] = [
  { code: 'PRJ-MX', name: '墨西哥新市场拓展', bu: 'BU-LATAM', type: '新市场', start: '2025-11', end: '2027-06', budget: yuan(3_200_000), owner: 'Carlos R.', plannedRoi: 0.35, plannedPaybackMonth: 10 },
  { code: 'PRJ-WH', name: '华南新仓（东莞）', bu: 'BU-B2C', type: '新仓', start: '2025-11', end: '2026-12', budget: yuan(2_600_000), owner: '陈晓', plannedRoi: 0.2, plannedPaybackMonth: 12 },
  { code: 'PRJ-TT', name: 'TikTok Shop 墨西哥投放', bu: 'BU-LATAM', type: '投放', start: '2026-02', end: '2026-12', budget: yuan(1_500_000), owner: '林悦', plannedRoi: 0.6, plannedPaybackMonth: 4 },
  { code: 'PRJ-ERP', name: '业财一体化系统建设', bu: 'GRP', type: '系统建设', start: '2026-01', end: '2026-12', budget: yuan(900_000), owner: 'Sylvia', plannedRoi: 0.15, plannedPaybackMonth: 11 },
]

export const accounts: Account[] = [
  { code: '1002', name: '银行存款', direction: '借', category: '资产', aux: ['币种'] },
  { code: '1122.01', name: '应收账款-平台', direction: '借', category: '资产', aux: ['店铺', 'BU'] },
  { code: '1122.02', name: '应收账款-客户', direction: '借', category: '资产', aux: ['客户', 'BU', '项目'] },
  { code: '1405', name: '库存商品', direction: '借', category: '资产', aux: ['SKU', 'BU'] },
  { code: '1411', name: '残次品', direction: '借', category: '资产', aux: ['SKU'] },
  { code: '2202', name: '应付账款', direction: '贷', category: '负债', aux: ['供应商'] },
  { code: '2202.99', name: '应付暂估', direction: '贷', category: '负债', aux: ['供应商'] },
  { code: '2203', name: '预收账款', direction: '贷', category: '负债', aux: ['客户'] },
  { code: '2221', name: '应交税费', direction: '贷', category: '负债', aux: [] },
  { code: '4001', name: '实收资本', direction: '贷', category: '权益', aux: [] },
  { code: '4103', name: '本年利润', direction: '贷', category: '权益', aux: [] },
  { code: '6001', name: '主营业务收入', direction: '贷', category: '收入', aux: ['BU', '项目', '店铺', 'SKU'] },
  { code: '6401', name: '主营业务成本', direction: '借', category: '成本', aux: ['BU', '项目', 'SKU'] },
  { code: '6601.01', name: '销售费用-佣金', direction: '借', category: '费用', aux: ['店铺', 'BU'] },
  { code: '6601.02', name: '销售费用-广告', direction: '借', category: '费用', aux: ['店铺', 'BU', '项目'] },
  { code: '6601.03', name: '销售费用-物流', direction: '借', category: '费用', aux: ['BU'] },
  { code: '6601.04', name: '销售费用-促销补贴', direction: '借', category: '费用', aux: ['店铺', 'BU'] },
  { code: '6602', name: '管理费用', direction: '借', category: '费用', aux: ['部门', 'BU', '项目'] },
  { code: '6711', name: '退货损失', direction: '借', category: '费用', aux: ['BU', 'SKU'] },
]

export const accountName = (code: string) => t(accounts.find((a) => a.code === code)?.name ?? code)

export const shops: Shop[] = [
  { code: 'AMZ-US', platform: 'Amazon', site: '美国站', bu: 'BU-B2C', currency: 'USD', cycle: '14 天', commissionRate: 0.15 },
  { code: 'TM-FLG', platform: '天猫', site: '旗舰店', bu: 'BU-B2C', currency: 'CNY', cycle: '确认收货 T+1', commissionRate: 0.05 },
  { code: 'SHP-MY', platform: 'Shopee', site: '马来西亚', bu: 'BU-B2C', currency: 'MYR', cycle: '7 天', commissionRate: 0.08 },
  { code: 'TTS-MX', platform: 'TikTok Shop', site: '墨西哥', bu: 'BU-LATAM', currency: 'MXN', cycle: '8 天', commissionRate: 0.06 },
  { code: 'DTC-WEB', platform: '独立站', site: 'Shopify', bu: 'BU-B2C', currency: 'USD', cycle: 'T+3', commissionRate: 0.029 },
]

export const customers: Customer[] = [
  { code: 'C-HL', name: '华联商贸有限公司', type: 'B2B 企业', creditLimit: yuan(800_000), termDays: 60, bu: 'BU-B2B', sales: '王磊', status: '正常' },
  { code: 'C-MJ', name: '美嘉零售集团', type: 'B2B 企业', creditLimit: yuan(500_000), termDays: 45, bu: 'BU-B2B', sales: '赵琳', status: '正常' },
  { code: 'C-GA', name: 'Grupo Azteca Retail', type: 'B2B 企业', creditLimit: yuan(600_000), termDays: 30, bu: 'BU-LATAM', sales: 'Carlos R.', status: '正常' },
  { code: 'C-XD', name: '星达电子商城', type: 'B2B 企业', creditLimit: yuan(200_000), termDays: 30, bu: 'BU-B2B', sales: '王磊', status: '冻结' },
  { code: 'C-AMZ', name: 'Amazon Payments', type: 'B2C 平台', creditLimit: 0, termDays: 14, bu: 'BU-B2C', sales: '—', status: '正常' },
  { code: 'C-TTS', name: 'TikTok Shop Settlement', type: 'B2C 平台', creditLimit: 0, termDays: 8, bu: 'BU-LATAM', sales: '—', status: '正常' },
]

export const suppliers: Supplier[] = [
  { code: 'S-YX', name: '东莞优选制造', type: '货品', termDays: 45, related: false },
  { code: 'S-SF', name: '顺丰供应链', type: '物流', termDays: 30, related: false },
  { code: 'S-CN', name: '菜鸟海外仓', type: '仓储', termDays: 30, related: false },
  { code: 'S-TT', name: 'TikTok Ads', type: '平台', termDays: 15, related: false },
  { code: 'S-HK', name: '镜账香港贸易', type: '货品', termDays: 60, related: true },
  { code: 'S-DEV', name: '云栈软件外包', type: '外包', termDays: 30, related: false },
]

export const skus: Sku[] = [
  { sku: 'SKU-A100', name: '无线降噪耳机', category: '数码音频', price: 499, cost: 210 },
  { sku: 'SKU-B220', name: '智能手环 Pro', category: '穿戴设备', price: 299, cost: 118 },
  { sku: 'SKU-C310', name: '便携咖啡机', category: '小家电', price: 699, cost: 335 },
  { sku: 'SKU-D450', name: '人体工学椅', category: '家居办公', price: 1299, cost: 640 },
  { sku: 'SKU-E580', name: '户外储能电源', category: '户外', price: 2199, cost: 1180 },
]

export const buName = (code?: string) => t(bus.find((b) => b.code === code)?.name ?? code ?? '未归类')
export const projectName = (code?: string) => t(projects.find((p) => p.code === code)?.name ?? code ?? '—')
export const shopName = (code?: string) => {
  const s = shops.find((x) => x.code === code)
  return s ? `${t(s.platform)}·${t(s.site)}` : code ?? '—'
}
export const customerName = (code?: string) => t(customers.find((c) => c.code === code)?.name ?? code ?? '—')
export const supplierName = (code?: string) => t(suppliers.find((s) => s.code === code)?.name ?? code ?? '—')
export const skuName = (code?: string) => t(skus.find((s) => s.sku === code)?.name ?? code ?? '—')
export const entityName = (code: string) => t(entities.find((e) => e.code === code)?.name ?? code)
