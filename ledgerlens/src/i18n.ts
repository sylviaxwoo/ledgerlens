import { EN } from './i18n.en'

export type Lang = 'en' | 'zh'

let current: Lang = 'en'

export const getLang = () => current

export function setLang(l: Lang) {
  current = l
  document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en'
}

function fill(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}

function lookup(key: string): string {
  const hit = EN[key]
  if (hit !== undefined) return hit
  const paren = key.match(/^(.*)（(.+)）$/)
  if (paren) return `${lookup(paren[1])} (${lookup(paren[2])})`
  if (key.includes(' ')) return key.split(' ').map(lookup).join(' ')
  return key
}

/** 以中文原文为 key；英文模式下查字典，缺失时按空格/括号拆分逐段翻译 */
export function t(key: string, vars?: Record<string, string | number>): string {
  return fill(current === 'zh' ? key : lookup(key), vars)
}
