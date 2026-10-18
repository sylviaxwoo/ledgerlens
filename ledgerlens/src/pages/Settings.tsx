import { useState } from 'react'
import { GitBranch, Upload } from 'lucide-react'
import { Badge, Button, Card, PageHeader, Table, Tabs, Td, Th } from '../components/ui'
import { accounts, buName, bus, customers, entities, projects, shops, skus, suppliers } from '../data/master'
import { FEE_MAPPING, RULES } from '../lib/rules'
import { useStore } from '../store'
import { money, pct, wan } from '../lib/format'
import { t } from '../i18n'

type Tab = 'entity' | 'bu' | 'coa' | 'party' | 'shop' | 'rules' | 'tags' | 'policy'

const TAG_DIMS = [
  ['业务单元（BU）', '核算主体划分', '所有凭证行', '业务单据继承'],
  ['项目', '项目制核算', '项目类收支', '业务单据继承'],
  ['店铺 / 平台账号', 'B2C 平台维度', 'B2C 相关凭证', '订单'],
  ['SKU / 品类', '商品维度', '收入、成本类凭证行', '订单行'],
  ['客户 / 供应商', '往来维度', 'AR / AP 类凭证行', '主数据'],
  ['部门 / 成本中心', '费用维度', '费用类凭证行', '费用单据'],
  ['币种', '原币 + 本位币双记', '所有凭证行', '系统自动'],
]

const POLICIES = [
  ['收入确认政策', 'BU-B2C：签收确认；BU-LATAM：发货确认；BU-B2B：开票 / 合同里程碑'],
  ['信用与账期策略', 'A 级 60 天 / B 级 45 天 / C 级 30 天；逾期 30 天自动冻结；T+3、T+15、T+30 催收节点'],
  ['坏账计提政策', '0-30 天 1%，31-60 天 5%，61-90 天 20%，90 天以上 50%'],
  ['成本分摊规则', 'ALLOC-v1：公共费用按收入占比分摊到 BU 与项目（版本化，变更需审批）'],
  ['审批流', '凭证审核：制单人 ≠ 审核人；付款按金额分级；坏账核销与反结账需财务总监或 CFO 审批'],
  ['编号规则', '凭证 JZ-YY-流水；订单 SO-类型-YYMMDD；退件 RT-YYMMDD；对账单 ST-流水'],
  ['多语言字典', '科目、报表、枚举值提供中 / 英 / 西三语翻译，统一术语表'],
]

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('rules')
  const { subsidyMapped, toast } = useStore()

  return (
    <div>
      <PageHeader
        title={t('基础配置')}
        subtitle={t('主数据与业务规则是凭证和看板的公共底座：支持启停、生效日期、变更日志与中 / 英 / 西三语名称')}
        actions={<Button variant="outline" onClick={() => toast('info', t('Excel 导入：将校验必填、唯一性与税号格式'))}><Upload size={15} />  {t('Excel 批量导入')}</Button>}
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'rules', label: t('凭证规则') },
          { key: 'tags', label: t('标签维度') },
          { key: 'policy', label: t('业务规则') },
          { key: 'entity', label: t('主体') },
          { key: 'bu', label: t('BU 与项目') },
          { key: 'coa', label: t('会计科目') },
          { key: 'party', label: t('客户与供应商') },
          { key: 'shop', label: t('店铺与 SKU') },
        ]}
      />

      {tab === 'rules' && (
        <div className="space-y-5">
          <Card title={t('凭证规则：业务事件 × 借贷科目 × 辅助核算映射')} pad={false} extra={t('按主体 / BU 生效，版本管理')}>
            <Table>
              <thead><tr><Th>{t('业务事件')}</Th><Th>{t('借方')}</Th><Th>{t('贷方')}</Th><Th>{t('辅助核算')}</Th><Th>{t('生效范围')}</Th><Th>{t('版本')}</Th></tr></thead>
              <tbody>
                {RULES.map((r) => (
                  <tr key={r.event}>
                    <Td className="font-medium">{t(r.event)}</Td>
                    <Td className="whitespace-normal text-slate-600">{t(r.debit)}</Td>
                    <Td className="whitespace-normal text-slate-600">{t(r.credit)}</Td>
                    <Td className="whitespace-normal text-xs text-slate-500">{t(r.aux)}</Td>
                    <Td className="text-xs">{t(r.scope)}</Td>
                    <Td><Badge tone="navy"><GitBranch size={11} /> {r.version}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          <Card title={t('平台费用映射')} pad={false}>
            <Table>
              <thead><tr><Th>{t('平台费用类型')}</Th><Th>{t('入账科目')}</Th><Th>{t('状态')}</Th></tr></thead>
              <tbody>
                {FEE_MAPPING.map((f) => {
                  const ok = f.fee !== '促销补贴' || subsidyMapped
                  return (
                    <tr key={f.fee}>
                      <Td className="font-medium">{t(f.fee)}</Td>
                      <Td>{ok ? t(f.account) : <span className="text-loss">{t('未配置')}</span>}</Td>
                      <Td>{ok ? <Badge tone="green">{t('已启用')}</Badge> : <Badge tone="red">{t('缺失 → 异常队列')}</Badge>}</Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </Card>
        </div>
      )}

      {tab === 'tags' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card title={t('标签维度定义')} pad={false} className="xl:col-span-2">
            <Table>
              <thead><tr><Th>{t('维度')}</Th><Th>{t('说明')}</Th><Th>{t('必填场景')}</Th><Th>{t('标签来源')}</Th></tr></thead>
              <tbody>
                {TAG_DIMS.map((r) => (
                  <tr key={r[0]}>{r.map((c, i) => <Td key={i} className={i === 0 ? 'font-medium' : 'text-slate-600'}>{t(c)}</Td>)}</tr>
                ))}
              </tbody>
            </Table>
          </Card>
          <Card title={t('继承与治理规则')}>
            <ul className="space-y-3 text-sm text-slate-600">
              <li><b className="text-ink">{t('自动继承：')}</b>{t('业务单据生成凭证时，单据标签自动带到凭证行。')}</li>
              <li><b className="text-ink">{t('缺失处理：')}</b>{t('必填维度缺失的凭证进入异常队列，不允许过账。')}</li>
              <li><b className="text-ink">{t('手工补标签：')}</b>{t('手工凭证允许补标签，但须满足必填规则。')}</li>
              <li><b className="text-ink">{t('不可篡改：')}</b>{t('已过账凭证的标签不可修改，只能红冲重记。')}</li>
              <li><b className="text-ink">{t('治理：')}</b>{t('新增标签值需财务总监审批；已用标签值只能停用不能删除。')}</li>
            </ul>
          </Card>
        </div>
      )}

      {tab === 'policy' && (
        <Card title={t('业务规则配置')} pad={false}>
          <Table>
            <tbody>
              {POLICIES.map(([k, v]) => (
                <tr key={k}><Td className="w-44 font-medium">{t(k)}</Td><Td className="whitespace-normal text-slate-600">{t(v)}</Td></tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === 'entity' && (
        <Card title={t('主体（法人实体）')} pad={false}>
          <Table>
            <thead><tr><Th>{t('编码')}</Th><Th>{t('名称')}</Th><Th>{t('注册国家')}</Th><Th>{t('税号（脱敏）')}</Th><Th>{t('本位币')}</Th><Th>{t('会计准则')}</Th><Th>{t('开户银行')}</Th><Th>{t('状态')}</Th></tr></thead>
            <tbody>
              {entities.map((e) => (
                <tr key={e.code}>
                  <Td className="font-medium">{e.code}</Td><Td>{t(e.name)}</Td><Td>{t(e.country)}</Td>
                  <Td className="text-slate-500">{e.taxId}</Td><Td>{e.currency}</Td><Td>{t(e.gaap)}</Td><Td>{t(e.bank)}</Td>
                  <Td><Badge tone="green">{t('启用')}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === 'bu' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card title={t('业务单元树')}>
            <div className="space-y-1 text-sm">
              {bus.map((b) => (
                <div key={b.code} className={b.parent ? 'ml-5 flex items-center gap-2 border-l border-slate-200 py-1.5 pl-3' : 'flex items-center gap-2 py-1.5 font-semibold'}>
                  <span>{t(b.name)}</span>
                  <span className="text-xs text-slate-400">{b.code}</span>
                  <Badge>{t(b.type)}</Badge>
                  <span className="ml-auto text-xs text-slate-500">{t(b.owner)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title={t('项目')} pad={false} className="xl:col-span-2">
            <Table>
              <thead><tr><Th>{t('编码')}</Th><Th>{t('名称')}</Th><Th>{t('所属 BU')}</Th><Th>{t('类型')}</Th><Th>{t('起止')}</Th><Th right>{t('预算')}</Th><Th right>{t('计划 ROI')}</Th><Th>{t('负责人')}</Th></tr></thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.code}>
                    <Td className="font-medium">{p.code}</Td><Td>{t(p.name)}</Td><Td>{buName(p.bu)}</Td><Td><Badge tone="navy">{t(p.type)}</Badge></Td>
                    <Td className="text-slate-500">{p.start} ~ {p.end}</Td><Td right>{wan(p.budget)}</Td><Td right>{pct(p.plannedRoi, 0)}</Td><Td>{t(p.owner)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}

      {tab === 'coa' && (
        <Card title={t('会计科目与辅助核算')} pad={false}>
          <Table>
            <thead><tr><Th>{t('科目编码')}</Th><Th>{t('科目名称')}</Th><Th>{t('类别')}</Th><Th>{t('余额方向')}</Th><Th>{t('辅助核算')}</Th><Th>{t('状态')}</Th></tr></thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.code}>
                  <Td className="font-medium">{a.code}</Td><Td>{t(a.name)}</Td><Td>{t(a.category)}</Td><Td>{t(a.direction)}</Td>
                  <Td><div className="flex flex-wrap gap-1">{a.aux.length ? a.aux.map((x) => <Badge key={x}>{t(x)}</Badge>) : <span className="text-slate-400">—</span>}</div></Td>
                  <Td><Badge tone="green">{t('启用')}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === 'party' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card title={t('客户')} pad={false}>
            <Table>
              <thead><tr><Th>{t('编码')}</Th><Th>{t('名称')}</Th><Th>{t('类型')}</Th><Th right>{t('信用额度')}</Th><Th>{t('账期')}</Th><Th>{t('状态')}</Th></tr></thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.code}>
                    <Td className="font-medium">{c.code}</Td><Td>{t(c.name)}</Td><Td>{t(c.type)}</Td>
                    <Td right>{c.creditLimit ? money(c.creditLimit) : '—'}</Td><Td>{t('{n} 天', { n: c.termDays })}</Td>
                    <Td><Badge tone={c.status === '正常' ? 'green' : 'red'}>{t(c.status)}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          <Card title={t('供应商')} pad={false}>
            <Table>
              <thead><tr><Th>{t('编码')}</Th><Th>{t('名称')}</Th><Th>{t('类型')}</Th><Th>{t('付款条件')}</Th><Th>{t('关联方')}</Th></tr></thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.code}>
                    <Td className="font-medium">{s.code}</Td><Td>{t(s.name)}</Td><Td>{t(s.type)}</Td><Td>{t('{n} 天', { n: s.termDays })}</Td>
                    <Td>{s.related ? <Badge tone="amber">{t('是')}</Badge> : t('否')}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}

      {tab === 'shop' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card title={t('店铺 / 平台账号')} pad={false}>
            <Table>
              <thead><tr><Th>{t('店铺编码')}</Th><Th>{t('平台 · 站点')}</Th><Th>{t('所属 BU')}</Th><Th>{t('结算币种')}</Th><Th>{t('结算周期')}</Th><Th right>{t('佣金费率')}</Th></tr></thead>
              <tbody>
                {shops.map((s) => (
                  <tr key={s.code}>
                    <Td className="font-medium">{s.code}</Td><Td>{t(s.platform)} · {t(s.site)}</Td><Td>{buName(s.bu)}</Td>
                    <Td>{s.currency}</Td><Td>{t(s.cycle)}</Td><Td right>{pct(s.commissionRate)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          <Card title={t('商品 / SKU')} pad={false}>
            <Table>
              <thead><tr><Th>SKU</Th><Th>{t('名称')}</Th><Th>{t('品类')}</Th><Th right>{t('售价')}</Th><Th right>{t('成本（加权平均）')}</Th></tr></thead>
              <tbody>
                {skus.map((s) => (
                  <tr key={s.sku}>
                    <Td className="font-medium">{s.sku}</Td><Td>{t(s.name)}</Td><Td>{t(s.category)}</Td>
                    <Td right>{s.price.toFixed(2)}</Td><Td right>{s.cost.toFixed(2)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  )
}
