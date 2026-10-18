export type Entity = {
  code: string
  name: string
  country: string
  taxId: string
  currency: string
  gaap: string
  bank: string
}

export type BU = {
  code: string
  name: string
  type: 'B2B' | 'B2C' | '逆向退件' | '区域' | '品类' | '集团'
  parent?: string
  owner: string
  entity: string
  since: string
}

export type ProjectType = '新业务' | '新仓' | '新市场' | '系统建设' | '投放'

export type Project = {
  code: string
  name: string
  bu: string
  type: ProjectType
  start: string
  end: string
  budget: number
  owner: string
  plannedRoi: number
  plannedPaybackMonth: number
}

export type AccountCategory = '资产' | '负债' | '权益' | '收入' | '成本' | '费用'

export type Account = {
  code: string
  name: string
  direction: '借' | '贷'
  category: AccountCategory
  aux: string[]
}

export type Shop = {
  code: string
  platform: string
  site: string
  bu: string
  currency: string
  cycle: string
  commissionRate: number
}

export type Customer = {
  code: string
  name: string
  type: 'B2B 企业' | 'B2C 平台' | '个人'
  creditLimit: number
  termDays: number
  bu: string
  sales: string
  status: '正常' | '冻结'
}

export type Supplier = {
  code: string
  name: string
  type: '货品' | '物流' | '仓储' | '平台' | '外包'
  termDays: number
  related: boolean
}

export type Sku = {
  sku: string
  name: string
  category: string
  price: number
  cost: number
}

export type OrderType = 'B2C' | 'B2B' | 'RTN'

export type Disposition = '二次销售' | '残次' | '报废' | '丢失'

export type Order = {
  id: string
  type: OrderType
  date: string
  channel: string
  customer: string
  bu?: string
  project?: string
  sku: string
  qty: number
  amount: number
  tax: number
  cost: number
  commission: number
  ads: number
  logistics: number
  subsidy: number
  status: string
  origOrder?: string
  reason?: string
  disposition?: Disposition
  nrv?: number
}

export type VoucherStatus = '草稿' | '待审核' | '已审核' | '已过账' | '已冲销'

export type Aux = {
  bu?: string
  project?: string
  shop?: string
  sku?: string
  customer?: string
  supplier?: string
}

export type VoucherLine = {
  account: string
  memo: string
  debit: number
  credit: number
  aux: Aux
}

export type Voucher = {
  id: string
  period: string
  date: string
  event: string
  sourceDoc: string
  idemKey: string
  lines: VoucherLine[]
  status: VoucherStatus
  maker: string
  reviewer?: string
  reversalOf?: string
  reversedBy?: string
  manual?: boolean
}

export type ExceptionReason = '科目映射缺失' | '借贷不平' | '期间已结账' | '重复生成' | '必填维度缺失'

export type VoucherException = {
  id: string
  sourceDoc: string
  event: string
  reason: ExceptionReason
  detail: string
  time: string
}

export type ArItem = {
  id: string
  customer: string
  doc: string
  bu: string
  project?: string
  date: string
  due: string
  amount: number
  settled: number
}

export type BankReceipt = {
  id: string
  date: string
  payer: string
  amount: number
  ref: string
  matched?: { arId: string; amount: number }[]
  prepaid?: number
}

export type ApItem = {
  id: string
  supplier: string
  source: '采购订单' | '物流费' | '仓储费' | '平台服务费' | '广告费' | '外包结算'
  bu: string
  project?: string
  po: number
  receipt: number
  invoice: number
  date: string
  due: string
  paid: number
  status: '待匹配' | '已匹配' | '匹配异常' | '已申请付款' | '已付款'
}

export type SettlementLine = {
  id: string
  shop: string
  order: string
  expected: number
  received: number
  diffType?: '扣款' | '延迟' | '保证金' | '费率差异' | '其他'
  status: '已匹配' | '差异' | '未匹配'
}
