import { getLang } from '../i18n'

// 金额统一以「分」为单位的整数存储，避免浮点误差（PRD 9.1 准确性要求）

export function money(cents: number, withSymbol = false): string {
  const s = (cents / 100).toLocaleString(getLang() === 'zh' ? 'zh-CN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return withSymbol ? `¥${s}` : s
}

/** 中文按「万」显示，英文按 K / M 显示 */
export function wan(cents: number, digits = 1): string {
  if (getLang() === 'zh') return `${(cents / 1_000_000).toFixed(digits)}万`
  const v = cents / 100
  return Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : `${(v / 1_000).toFixed(1)}K`
}

/** 图表坐标轴刻度 */
export function axisWan(cents: number): string {
  if (getLang() === 'zh') return `${(cents / 1_000_000).toFixed(0)}万`
  const v = cents / 100
  return Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1_000).toFixed(0)}K`
}

export function pct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`
}

export function yuan(n: number): number {
  return Math.round(n * 100)
}

export function sum<T>(arr: T[], f: (x: T) => number): number {
  return arr.reduce((a, x) => a + f(x), 0)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

export function cls(...xs: (string | false | null | undefined)[]): string {
  return xs.filter(Boolean).join(' ')
}
