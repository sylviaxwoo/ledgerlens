import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve('src')
const files = []
const walk = (d) => fs.readdirSync(d).forEach((f) => {
  const p = path.join(d, f)
  if (fs.statSync(p).isDirectory()) walk(p)
  else if (/\.tsx?$/.test(f) && !f.startsWith('i18n') && f !== 'format.ts') files.push(p)
})
walk(root)

const CJK = /[\u4e00-\u9fff]/
const keys = new Set()
for (const f of files) {
  const src = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const visit = (n) => {
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && CJK.test(n.text)) keys.add(n.text)
    if (ts.isTemplateExpression(n)) {
      for (const part of [n.head, ...n.templateSpans.map((s) => s.literal)]) {
        for (const piece of part.text.split(/[\s|]+/)) if (CJK.test(piece)) keys.add(piece)
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(src)
}

const enSrc = ts.transpileModule(fs.readFileSync('src/i18n.en.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { EN } = await import('data:text/javascript,' + encodeURIComponent(enSrc))
function covered(k) {
  if (EN[k] !== undefined) return true
  const m = k.match(/^(.*)（(.+)）$/)
  if (m) return covered(m[1]) && covered(m[2])
  if (k.includes(' ')) return k.split(' ').every((p) => !CJK.test(p) || covered(p))
  return false
}
const missing = [...keys].filter((k) => !covered(k)).sort()
if (process.argv[2] === '--all') console.log([...keys].sort().join('\n'))
else { console.log(missing.join('\n')); console.error(`${missing.length} missing / ${keys.size} keys`) }
