import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import type { PlatformModule } from '../types'
import { providerLabel } from '../utils/displayLabels'

const statusLabels: Record<PlatformModule['status'], string> = {
  ready: '可用',
  partial: '部分可用',
  planned: '准备中',
}

const trackLabels: Record<PlatformModule['track'], string> = {
  research: '科研情报',
  learning: '学习产品',
  business: '产业情报',
  operations: '数据运营',
  community: '社区与评价',
  commercial: '商业化基础设施',
}

function infraState(configured: boolean) {
  return configured ? '已配置' : '未配置'
}

const adminSiteUrl = import.meta.env.VITE_ADMIN_SITE_URL || 'http://localhost:5176'

function ModuleCard({ item }: { item: PlatformModule }) {
  return (
    <article className={`platform-module platform-module-${item.status}`}>
      <div className="platform-module-head">
        <div>
          <span>{trackLabels[item.track]}</span>
          <h3>{item.name}</h3>
        </div>
        <strong>{item.maturity}%</strong>
      </div>
      <p>{item.summary}</p>
      <div className="platform-meter" aria-label={`${item.name} 完成度 ${item.maturity}%`}>
        <i style={{ width: `${item.maturity}%` }} />
      </div>
      <div className="platform-module-columns">
        <div>
          <em>已完成</em>
          {item.shipped.map((task) => <small key={task}>{task}</small>)}
        </div>
        <div>
          <em>下一步</em>
          {item.next.map((task) => <small key={task}>{task}</small>)}
        </div>
      </div>
      <b>{statusLabels[item.status]}</b>
    </article>
  )
}

export default function PlatformPage() {
  const overview = useQuery({
    queryKey: ['platform-overview'],
    queryFn: () => api.platform(),
  })
  const settings = useQuery({
    queryKey: ['public-site-settings'],
    queryFn: api.publicSiteSettings,
  })

  if (overview.isLoading) {
    return <div className="learning-muted">正在加载平台概览...</div>
  }

  if (!overview.data) {
    return <div className="learning-muted">平台状态暂不可用。</div>
  }

  const data = overview.data
  const topology = data.topology
  const publicSettings = settings.data || {}

  return (
    <div className="platform-page">
      <section className="platform-hero">
        <div>
          <span>平台控制台</span>
          <h1>平台中枢</h1>
          <p>
            把 SiliconScope v2 拆成长期可维护的科研、学习、产业、社区和商业基础设施模块。
            这里展示当前模块成熟度、已可用能力，以及接下来最值得继续打磨的重点。
          </p>
        </div>
        <div className="platform-score">
          <strong>{data.summary.averageMaturity}%</strong>
          <span>平均完成度</span>
        </div>
      </section>

      <section className="platform-summary">
        <div><span>模块总数</span><strong>{data.summary.modules}</strong></div>
        <div><span>可用</span><strong>{data.summary.ready}</strong></div>
        <div><span>部分可用</span><strong>{data.summary.partial}</strong></div>
        <div><span>准备中</span><strong>{data.summary.planned}</strong></div>
      </section>

      <section className="platform-grid">
        <div className="platform-panel platform-wide">
          <div className="platform-panel-head">
            <span>模块地图</span>
            <h2>产品模块地图</h2>
          </div>
          <div className="platform-track-grid">
            {data.tracks.map((track) => (
              <div className="platform-track" key={track.id}>
                <strong>{track.score}%</strong>
                <span>{track.name}</span>
                <small>{track.modules} 个模块</small>
              </div>
            ))}
          </div>
        </div>

        <div className="platform-panel">
          <div className="platform-panel-head">
            <span>数据层</span>
            <h2>基础设施状态</h2>
          </div>
          <dl className="platform-infra">
            <div><dt>论文元数据</dt><dd>{providerLabel(topology.metadataStore.provider)}</dd></div>
            <div><dt>应用数据库</dt><dd>{providerLabel(topology.appStore.provider)} / {infraState(topology.appStore.configured)}</dd></div>
            <div><dt>缓存</dt><dd>{providerLabel(topology.cache.provider)} / {infraState(topology.cache.configured)}</dd></div>
            <div><dt>搜索</dt><dd>{providerLabel(topology.search.provider)} / {infraState(topology.search.configured)}</dd></div>
            <div><dt>对象存储</dt><dd>{providerLabel(topology.objectStorage.provider)} / {infraState(topology.objectStorage.configured)}</dd></div>
            <div><dt>任务队列</dt><dd>{providerLabel(topology.queue.provider)} / {infraState(topology.queue.configured)}</dd></div>
          </dl>
        </div>

        <div className="platform-panel">
          <div className="platform-panel-head">
            <span>产品模式</span>
            <h2>运营开关</h2>
          </div>
          <dl className="platform-infra">
            <div><dt>受控访问</dt><dd>{publicSettings.invite_only_mode ? '开启' : '关闭'}</dd></div>
            <div><dt>维护模式</dt><dd>{publicSettings.maintenance_mode ? '开启' : '关闭'}</dd></div>
            <div><dt>AI 报告</dt><dd>{publicSettings.ai_reports_enabled ? '启用' : '未启用'}</dd></div>
            <div><dt>支付</dt><dd>{publicSettings.checkout_enabled ? '启用' : '关闭'}</dd></div>
            <div><dt>导出</dt><dd>{publicSettings.export_center_enabled ? '启用' : '未启用'}</dd></div>
          </dl>
          {publicSettings.data_readiness_banner && (
            <p className="learning-muted">{String(publicSettings.data_readiness_banner)}</p>
          )}
        </div>
      </section>

      <section className="platform-modules">
        {data.modules.map((item) => <ModuleCard key={item.id} item={item} />)}
      </section>

      <section className="platform-grid">
        <div className="platform-panel">
          <div className="platform-panel-head">
            <span>里程碑</span>
            <h2>下一阶段重点</h2>
          </div>
          <ol className="platform-milestones">
            {data.nextMilestones.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </div>
        <div className="platform-panel">
          <div className="platform-panel-head">
            <span>快捷入口</span>
            <h2>常用入口</h2>
          </div>
          <div className="platform-shortcuts">
            <a href={adminSiteUrl}>打开独立管理后台</a>
            <Link to="/venue-matrix">会议/期刊</Link>
            <Link to="/companies">企业情报</Link>
            <Link to="/learning-path">路线库</Link>
            <Link to="/exports">导出中心</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
