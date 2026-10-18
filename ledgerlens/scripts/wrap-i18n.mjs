// 一次性 codemod：把 JSX 文本和展示类属性中的中文包成 t('...')
import ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'

const CJK = /[\u4e00-\u9fff]/
const SKIP_ATTRS = new Set(['value', 'key', 'dataKey', 'stackId', 'to', 'className', 'nameKey', 'yAxisId'])
const files = process.argv.slice(2)

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const edits = []
  const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

  function visit(node) {
    if (ts.isJsxText(node) && CJK.test(node.text)) {
      const raw = node.text
      const lead = raw.match(/^\s*/)[0]
      const trail = raw.match(/\s*$/)[0]
      const core = raw.trim()
      const keepSpace = (ws) => (ws.includes('\n') ? '' : ws)
      const out = `${keepSpace(lead)}{t(${q(core)})}${keepSpace(trail)}`
      edits.push([node.getStart(sf, false), node.end, out])
    } else if (
      ts.isJsxAttribute(node) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      CJK.test(node.initializer.text) &&
      !SKIP_ATTRS.has(node.name.getText(sf))
    ) {
      edits.push([node.initializer.getStart(sf), node.initializer.end, `{t(${q(node.initializer.text)})}`])
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)

  let out = src
  for (const [s, e, r] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + r + out.slice(e)

  if (edits.length && !/import \{[^}]*\bt\b[^}]*\} from '\.\.\/i18n'/.test(out)) {
    const rel = path.relative(path.dirname(file), path.resolve('src/i18n')).replace(/\\/g, '/')
    const spec = rel.startsWith('.') ? rel : `./${rel}`
    const lastImport = [...out.matchAll(/^import .*$/gm)].pop()
    const at = lastImport.index + lastImport[0].length
    out = out.slice(0, at) + `\nimport { t } from '${spec}'` + out.slice(at)
  }
  fs.writeFileSync(file, out)
  console.log(file, edits.length)
}
