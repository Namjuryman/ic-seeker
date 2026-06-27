import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import type { PlatformModule } from '../types'

const statusLabels: Record<PlatformModule['status'], string> = {
  ready: '可用',
  partial: '进行中',
  planned: '规划中',
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
  return configured ? '已配置' : '本地 / 待接入'
}

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
      <div className="platform-meter" aria-label={`${item.name} maturity ${item.maturity}%`}>
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

  if (overview.isLoading) {
    return <div className="learning-muted">Loading platform overview...</div>
  }

  if (!overview.data) {
    return <div className="learning-muted">平台状态暂不可用。</div>
  }

  const data = overview.data
  const topology = data.topology

  return (
    <div className="platform-page">
      <section className="platform-hero">
        <div>
          <span>Platform Console</span>
          <h1>平台中枢</h1>
          <p>
            把 SiliconScope v2 拆成长期可维护的科研、学习、产业、社区和商业基础设施模块。
            这里展示当前成熟度、已完成能力，以及接下来最值得继续打磨的硬任务。
          </p>
        </div>
        <div className="platform-score">
          <strong>{data.summary.averageMaturity}%</strong>
          <span>平均成熟度</span>
        </div>
      </section>

      <section className="platform-summary">
        <div><span>模块总数</span><strong>{data.summary.modules}</strong></div>
        <div><span>可用</span><strong>{data.summary.ready}</strong></div>
        <div><span>进行中</span><strong>{data.summary.partial}</strong></div>
        <div><span>规划中</span><strong>{data.summary.planned}</strong></div>
      </section>

      <section className="platform-grid">
        <div className="platform-panel platform-wide">
          <div className="platform-panel-head">
            <span>Module Map</span>
            <h2>产品模块地图</h2>
          </div>
          <div className="platform-track-grid">
            {data.tracks.map((track) => (
              <div className="platform-track" key={track.id}>
                <strong>{track.score}%</strong>
                <span>{track.name}</span>
                <small>{track.modules} modules</small>
              </div>
            ))}
          </div>
        </div>

        <div className="platform-panel">
          <div className="platform-panel-head">
            <span>Data Layer</span>
            <h2>基础设施状态</h2>
          </div>
          <dl className="platform-infra">
            <div><dt>Metadata</dt><dd>{topology.metadataStore.provider}</dd></div>
            <div><dt>App DB</dt><dd>{topology.appStore.provider} / {infraState(topology.appStore.configured)}</dd></div>
            <div><dt>Cache</dt><dd>{topology.cache.provider} / {infraState(topology.cache.configured)}</dd></div>
            <div><dt>Search</dt><dd>{topology.search.provider} / {infraState(topology.search.configured)}</dd></div>
            <div><dt>Storage</dt><dd>{topology.objectStorage.provider} / {infraState(topology.objectStorage.configured)}</dd></div>
            <div><dt>Queue</dt><dd>{topology.queue.provider} / {infraState(topology.queue.configured)}</dd></div>
          </dl>
        </div>
      </section>

      <section className="platform-modules">
        {data.modules.map((item) => <ModuleCard key={item.id} item={item} />)}
      </section>

      <section className="platform-grid">
        <div className="platform-panel">
          <div className="platform-panel-head">
            <span>Milestones</span>
            <h2>下一阶段硬任务</h2>
          </div>
          <ol className="platform-milestones">
            {data.nextMilestones.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </div>
        <div className="platform-panel">
          <div className="platform-panel-head">
            <span>Shortcuts</span>
            <h2>常用入口</h2>
          </div>
          <div className="platform-shortcuts">
            <Link to="/admin/job-operations">运维台账</Link>
            <Link to="/admin/ingestion">导入任务</Link>
            <Link to="/admin/snapshots">快照管理</Link>
            <Link to="/admin/data-quality">数据质量</Link>
            <Link to="/admin/identity">别名管理</Link>
            <Link to="/venue-matrix">会议/期刊</Link>
            <Link to="/companies">企业情报</Link>
            <Link to="/learning-path">路线库</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
