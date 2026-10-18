import { projects } from './master'
import { yuan } from '../lib/format'

export const MONTHS = [
  '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04',
  '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10',
]

export const shortMonth = (m: string) => `${m.slice(2, 4)}/${m.slice(5)}`

const SEASON = [1.42, 1.18, 0.96, 0.82, 0.92, 0.95, 1.0, 1.12, 0.98, 1.02, 1.05, 1.08]

type BuProfile = {
  code: string
  base: number
  growth: number
  cogs: number
  platform: number
  logistics: number
  ads: number
  returns: number
  start?: number
}

const PROFILES: BuProfile[] = [
  { code: 'BU-B2C', base: 3_650_000, growth: 0.012, cogs: 0.46, platform: 0.11, logistics: 0.07, ads: 0.09, returns: 0.025 },
  { code: 'BU-B2B', base: 2_150_000, growth: 0.008, cogs: 0.58, platform: 0, logistics: 0.03, ads: 0.01, returns: 0.008 },
  { code: 'BU-RTN', base: 260_000, growth: 0.004, cogs: 0.62, platform: 0.04, logistics: 0.16, ads: 0, returns: 0.21 },
  { code: 'BU-LATAM', base: 380_000, growth: 0.16, cogs: 0.5, platform: 0.08, logistics: 0.11, ads: 0.16, returns: 0.035 },
]

export type BuMonth = {
  month: string
  bu: string
  gmv: number
  revenue: number
  cogs: number
  platformFee: number
  logistics: number
  ads: number
  returnLoss: number
  gross: number
  contribution: number
  budgetRevenue: number
}

function wobble(i: number, k: number) {
  return 1 + Math.sin(i * 1.7 + k * 2.3) * 0.035
}

export const buMonthly: BuMonth[] = PROFILES.flatMap((p, k) =>
  MONTHS.map((month, i) => {
    const ramp = p.code === 'BU-LATAM' ? Math.min(1, 0.25 + i * 0.09) : 1
    const rev = p.base * (1 + p.growth * i) * SEASON[i] * wobble(i, k) * ramp
    const revenue = yuan(Math.round(rev))
    const cogs = Math.round(revenue * p.cogs)
    const platformFee = Math.round(revenue * p.platform)
    const logistics = Math.round(revenue * p.logistics)
    const ads = Math.round(revenue * p.ads * (p.code === 'BU-LATAM' ? 1.4 - i * 0.04 : 1))
    const returnLoss = Math.round(revenue * p.returns)
    const gross = revenue - cogs
    return {
      month,
      bu: p.code,
      gmv: Math.round(revenue * 1.12),
      revenue,
      cogs,
      platformFee,
      logistics,
      ads,
      returnLoss,
      gross,
      contribution: gross - platformFee - logistics - ads - returnLoss,
      budgetRevenue: yuan(Math.round(p.base * (1 + p.growth * i) * SEASON[i] * ramp * 1.03)),
    }
  }),
)

export const cashSeries = MONTHS.map((month, i) => ({
  month,
  inflow: yuan(Math.round(6_100_000 * SEASON[i] * (1 + 0.012 * i))),
  outflow: yuan(Math.round(5_550_000 * SEASON[i] * (1 + 0.011 * i) + (i === 1 ? 600_000 : 0))),
  balance: yuan(Math.round(4_200_000 + i * 185_000 + Math.sin(i) * 160_000)),
}))

/* ---------------- 项目 ROI ---------------- */

export const INVEST_CATS = ['采购与物料', '人力外包', '广告投放', '物流与仓储', '系统与设备折旧', '分摊费用'] as const
export type InvestCat = (typeof INVEST_CATS)[number]

export type ProjectMonth = {
  month: string
  invest: Record<InvestCat, number>
  revenue: number
  gross: number
  contribution: number
}

function inv(partial: Partial<Record<InvestCat, number>>): Record<InvestCat, number> {
  const r = {} as Record<InvestCat, number>
  for (const c of INVEST_CATS) r[c] = yuan(partial[c] ?? 0)
  return r
}

function out(contribution: number, grossMargin = 0.42, contribRatio = 0.55) {
  const gross = contribution / contribRatio
  const revenue = gross / grossMargin
  return { revenue: yuan(Math.round(revenue)), gross: yuan(Math.round(gross)), contribution: yuan(Math.round(contribution)) }
}

const PROJECT_GEN: Record<string, (k: number) => Omit<ProjectMonth, 'month'>> = {
  'PRJ-MX': (k) => ({
    invest: inv({
      采购与物料: k < 2 ? 260_000 : 50_000,
      人力外包: 55_000,
      广告投放: k < 4 ? 90_000 : 30_000,
      物流与仓储: 38_000 + k * 2_000,
      分摊费用: 22_000,
    }),
    ...out(Math.min(480_000, k === 0 ? 0 : 40_000 + (k - 1) * 60_000)),
  }),
  'PRJ-WH': (k) => ({
    invest: inv({
      系统与设备折旧: k === 0 ? 520_000 : k === 1 ? 310_000 : 28_000,
      物流与仓储: 92_000,
      人力外包: 46_000,
      分摊费用: 15_000,
    }),
    ...out(k < 2 ? 12_000 : 40_000 + (k - 2) * 19_000, 0.4, 0.5),
  }),
  'PRJ-TT': (k) => ({
    invest: inv({
      广告投放: k < 2 ? 175_000 : 132_000,
      人力外包: 28_000,
      物流与仓储: 14_000 + k * 1_500,
      分摊费用: 9_000,
    }),
    ...out(k === 0 ? 45_000 : 95_000 + k * 41_000, 0.45, 0.6),
  }),
  'PRJ-ERP': (k) => ({
    invest: inv({
      人力外包: k < 6 ? 82_000 : 46_000,
      系统与设备折旧: 9_000,
      分摊费用: 6_000,
    }),
    ...out(k < 5 ? 0 : 22_000 + (k - 5) * 14_000, 1, 1),
  }),
}

export const projectMonthly: Record<string, ProjectMonth[]> = Object.fromEntries(
  projects.map((p) => {
    const startIdx = MONTHS.indexOf(p.start)
    const rows = MONTHS.slice(startIdx).map((month, k) => ({ month, ...PROJECT_GEN[p.code](k) }))
    return [p.code, rows]
  }),
)

export const investTotal = (r: Record<InvestCat, number>) => INVEST_CATS.reduce((a, c) => a + r[c], 0)

const CLOSED_AT: Record<string, string> = { '2026-07': '2026-08-05', '2026-08': '2026-09-04', '2026-09': '2026-10-05' }

/** 月结后冻结的 ROI 快照（历史口径不被后续调整改写） */
export const roiSnapshots: { project: string; period: string; closedAt: string; cumInvest: number; cumContribution: number; roi: number; ruleVersion: string }[] =
  projects.flatMap((p) => {
    const rows = projectMonthly[p.code]
    return ['2026-07', '2026-08', '2026-09'].map((period) => {
      const upto = rows.filter((r) => r.month <= period)
      const ci = upto.reduce((a, r) => a + investTotal(r.invest), 0)
      const cc = upto.reduce((a, r) => a + r.contribution, 0)
      return {
        project: p.code,
        period,
        closedAt: CLOSED_AT[period],
        cumInvest: ci,
        cumContribution: cc,
        roi: ci ? (cc - ci) / ci : 0,
        ruleVersion: 'ALLOC-v1 按收入',
      }
    })
  })
