import { Link, useParams } from 'react-router-dom'

type LegalDoc = {
  slug: string
  title: string
  summary: string
  sections: Array<{ heading: string; body: string }>
}

const contacts = {
  support: '站内反馈或运营邮箱',
  privacy: '隐私与数据请求渠道',
  copyright: '版权与来源争议渠道',
  corrections: '数据纠错渠道',
  moderation: '社区举报与审核渠道',
}

const aiReportDisclaimer = '报告由 SiliconScope 的论文元数据、公开来源和用户选择的输入生成。涉及论文、公司、机构和研究者线索的重要判断，都需要回到官方来源或原始论文人工核验。'

const docs: LegalDoc[] = [
  {
    slug: 'terms',
    title: '服务边界',
    summary: 'SiliconScope 是 IC 论文检索、学习路线和研究情报工作台，提供可核验线索，不替代人工判断。',
    sections: [
      {
        heading: '产品定位',
        body: 'SiliconScope 提供论文元数据探索、收藏/阅读工作区、对比、报告和学习导航。它不提供论文 PDF 全文分发、未经授权的数据转售、招聘抓取、投资建议，或对个人、机构和公司的定性裁决。',
      },
      {
        heading: '指标解释',
        body: '页面里的分数、排序、密度、对比和报告类标签，都是基于当前数据覆盖、来源和筛选条件的方向性信号，不代表完整学术判断、录取保证、就业建议或投资建议。',
      },
      {
        heading: '合理使用',
        body: '请勿上传违法内容、尝试获取隐藏用户数据、借平台抓取受限来源、识别匿名审稿人，或用平台骚扰个人、学校、实验室和公司。',
      },
      {
        heading: '联系',
        body: `产品、账户和访问问题可以通过${contacts.support}提交。`,
      },
    ],
  },
  {
    slug: 'privacy',
    title: '隐私与工作区数据',
    summary: '这里说明 SiliconScope 可能处理的数据类型，以及用户可以提出的请求。',
    sections: [
      {
        heading: '用户工作区数据',
        body: '为了运行产品，系统可能处理账号、关注列表、保存搜索、阅读队列、笔记、标签、评论、研究者评价、用量记录、订阅事件和后台审计日志。',
      },
      {
        heading: '删除、导出和更正',
        body: `用户可以通过${contacts.privacy}申请账户删除、个人数据导出、自己提交内容的更正或移除，以及订阅相关数据问题处理。`,
      },
      {
        heading: '后台隔离',
        body: '管理后台应与普通用户界面分离，并使用登录和外部访问层保护，例如 Cloudflare Access、VPN 或等效安全网关。',
      },
    ],
  },
  {
    slug: 'copyright',
    title: '版权与数据来源',
    summary: 'SiliconScope 展示论文元数据、DOI、来源链接和用户自己的笔记，不公开分发出版商 PDF。',
    sections: [
      {
        heading: '元数据优先',
        body: '论文记录应来自允许使用的元数据来源、DOI、出版社页面、人工 CSV 导入或用户自己的私有文献库。公开页面不应重新分发受版权保护的 PDF 全文。',
      },
      {
        heading: '本地 PDF',
        body: '本地 PDF 匹配属于用户个人索引流程。系统可以记录本地路径、哈希、DOI 猜测和阅读进度，但不应上传、公开或售卖版权 PDF。',
      },
      {
        heading: '下架和来源争议',
        body: `版权投诉、下架请求、来源标注争议和元数据移除请求可以通过${contacts.copyright}提交。请求中应包含目标页面、争议字段、主张权利、期望处理方式和联系方式。`,
      },
    ],
  },
  {
    slug: 'ai-disclaimer',
    title: 'AI 报告声明',
    summary: 'AI 报告只能作为研究辅助层，必须保留来源、口径和人工核验空间。',
    sections: [
      {
        heading: '必要声明',
        body: aiReportDisclaimer,
      },
      {
        heading: '生成内容限制',
        body: 'AI 报告应基于用户选择的输入和可追溯来源生成，并展示数据来源、生成时间、筛选条件和注意事项。它不应声称某位研究者、学校、公司或职业选择是唯一最优。',
      },
      {
        heading: '人工复核',
        body: 'AI 输出需要来源复核。涉及重要选择时，用户仍应核对原始论文、机构页面、课题组页面、公司公告、公开备案或直接沟通信息。',
      },
    ],
  },
  {
    slug: 'community-guidelines',
    title: '社区与评价规则',
    summary: '讨论和研究者评价需要审核、样本量门槛和反滥用机制。',
    sections: [
      {
        heading: '论文讨论',
        body: '论文讨论应支持举报和审核，避免人身攻击、骚扰、开盒、暴露私人身份、歧视性表达和无证据指控。',
      },
      {
        heading: '研究者评价',
        body: '研究者评价汇总必须使用已审核内容，并设置样本量门槛。页面应呈现适配型信号，例如指导风格、沟通、研究方向和组内流程，而不是定性裁决或单一排序。',
      },
      {
        heading: '举报渠道',
        body: `涉及滥用、隐私、安全或身份暴露的问题，可以通过${contacts.moderation}提交。紧急隐私或安全问题应先隐藏再复核。`,
      },
    ],
  },
  {
    slug: 'contact-takedown',
    title: '纠错、联系与下架',
    summary: '用于处理论文、作者、机构、公司和社区内容的纠错或移除请求。',
    sections: [
      {
        heading: '元数据纠错',
        body: `论文、作者、机构、会议/期刊、公司、方向和来源字段的纠错，可以通过${contacts.corrections}提交。请尽量附上错误字段、建议修正和官方来源链接。`,
      },
      {
        heading: '请求记录',
        body: '每个请求都应记录目标页面、请求人联系方式、类别、状态、处理决定和时间。反复出现的来源冲突应进入数据质量队列继续处理。',
      },
      {
        heading: '数据删除',
        body: `账户、个人工作区、用户评价和个人数据删除请求可以通过${contacts.privacy}处理。`,
      },
    ],
  },
  {
    slug: 'mentor-review-policy',
    title: '研究者评价政策',
    summary: '研究者相关内容应被审核、脱敏，并以适配信息为主。',
    sections: [
      {
        heading: '展示门槛',
        body: '公开研究者评价汇总需要足够的已审核评价。少于 3 条不展示汇总或评论；3 到 4 条只展示聚合分布；5 到 9 条可展示结构化摘要；10 条及以上才考虑展示经审核的匿名评论摘录。',
      },
      {
        heading: '允许关注点',
        body: '评价应聚焦指导方式、研究适配、沟通、工作节奏、经费/流程清晰度和组内实践。人身攻击、开盒、歧视、健康猜测和无法核验的严重指控应被移除或隐藏。',
      },
    ],
  },
  {
    slug: 'company-data-policy',
    title: '企业数据来源政策',
    summary: '企业情报是公开来源整理目录，不替代岗位、商业或投资判断。',
    sections: [
      {
        heading: '允许来源',
        body: '企业事实应来自官网、公开备案、公开年报、官方注册信息、人工审核的 CSV 导入、审核过的来源链接，或条款允许使用的授权数据集。',
      },
      {
        heading: '企业页面边界',
        body: '企业页面用于理解产业方向、岗位类型和论文/技术线索。它不提供对公司的定性裁决、员工评价、招聘抓取或投资建议。',
      },
      {
        heading: '市场数据提示',
        body: '股票代码、市值、股价和涨跌幅等字段只是带来源时间戳的参考信息，可能过期、不完整或不可用，不能作为金融建议。',
      },
    ],
  },
  {
    slug: 'service-limits',
    title: '服务限制与责任边界',
    summary: 'SiliconScope 应作为研究工作台使用，并明确展示数据不确定性。',
    sections: [
      {
        heading: '不提供专业建议',
        body: 'SiliconScope 不提供法律、金融、升学、就业、移民、投稿或投资建议。用户需要根据官方来源和专业意见自行核验重要决策。',
      },
      {
        heading: '数据不确定性',
        body: '分类、实体匹配、公司画像、方向报告、对比、地域图、快照和 AI 摘要都可能不完整或出错。涉及判断的页面应尽量展示来源、置信度、生成时间、筛选条件、注意事项和纠错入口。',
      },
    ],
  },
]

export default function LegalPage() {
  const params = useParams()
  const selected = docs.find((doc) => doc.slug === params.slug) || docs[0]

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">政策边界</p>
        <h1 className="text-2xl font-bold text-ink-text mt-0.5">法律与产品边界</h1>
        <p className="text-sm text-ink-muted mt-1">
          这里集中说明 SiliconScope 的数据来源、版权、AI、社区评价和服务限制。核心原则是：清楚展示来源和不确定性，不把线索包装成最终结论。
        </p>
      </section>

      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-5">
        <aside className="bg-surface-panel border border-line rounded-xl p-4 shadow-sm h-fit">
          <nav className="grid gap-2" aria-label="政策导航">
            {docs.map((doc) => (
              <Link
                key={doc.slug}
                to={`/legal/${doc.slug}`}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${doc.slug === selected.slug ? 'bg-brand-50 text-brand-700 border-brand-100' : 'bg-surface-elevated text-ink-secondary border-line'}`}
              >
                {doc.title}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="bg-surface-panel border border-line rounded-xl p-6 shadow-sm">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">边界说明</p>
          <h2 className="text-3xl font-bold text-ink-text mt-1">{selected.title}</h2>
          <p className="text-sm text-ink-muted mt-2 leading-relaxed">{selected.summary}</p>

          <div className="mt-6 space-y-5">
            {selected.sections.map((section) => (
              <section key={section.heading} className="border-t border-line pt-5">
                <h3 className="font-semibold text-ink-text">{section.heading}</h3>
                <p className="text-sm text-ink-muted mt-2 leading-relaxed">{section.body}</p>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
