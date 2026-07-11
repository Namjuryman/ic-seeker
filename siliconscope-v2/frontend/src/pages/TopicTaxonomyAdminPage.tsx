import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { friendlyError } from '../utils/errorMessages'

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{typeof value === 'number' ? value.toLocaleString() : value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  )
}

function taxonomySourceLabel(source?: string | null) {
  if (!source) return '加载中'
  const labels: Record<string, string> = {
    database: '后台分类库',
    seed: '预置分类',
  }
  return labels[source] || '来源待确认'
}

export default function TopicTaxonomyAdminPage() {
  const queryClient = useQueryClient()
  const overview = useQuery({
    queryKey: ['topic-taxonomy-admin'],
    queryFn: () => api.topicTaxonomyAdmin(),
  })
  const taxonomy = useQuery({
    queryKey: ['topic-taxonomy'],
    queryFn: () => api.topicTaxonomy(),
  })
  const sync = useMutation({
    mutationFn: () => api.syncTopicTaxonomy(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic-taxonomy-admin'] })
      queryClient.invalidateQueries({ queryKey: ['topic-taxonomy'] })
    },
  })
  const refreshEdges = useMutation({
    mutationFn: () => api.refreshPaperTopicEdges({ limit: 50000, minConfidence: 45, reset: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic-taxonomy-admin'] })
      queryClient.invalidateQueries({ queryKey: ['topic-taxonomy'] })
    },
  })

  const data = overview.data
  const tree = taxonomy.data?.tree || []

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <span>方向知识库</span>
          <h1>方向分类控制台</h1>
          <p>
            管理 IC 方向层级，用于搜索筛选、方向报告、论文-方向关联，以及人工分类校正。
          </p>
        </div>
        <div className={`admin-health ${data?.drift.inSync ? 'admin-health-ok' : 'admin-health-warn'}`}>
          <strong>{data?.drift.inSync ? '已同步' : '有差异'}</strong>
          <span>{taxonomySourceLabel(taxonomy.data?.source)}</span>
        </div>
      </section>

      {(sync.isError || refreshEdges.isError) && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {friendlyError(sync.error || refreshEdges.error, '方向分类操作失败。')}
        </div>
      )}

      {sync.data && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
          已同步 {sync.data.database.nodes} 个方向节点、{sync.data.database.aliases} 个别名、{sync.data.database.keywordRules} 条关键词规则。
        </div>
      )}

      {refreshEdges.data && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
          已从 {refreshEdges.data.scannedPapers.toLocaleString()} 篇论文中刷新 {refreshEdges.data.writtenEdges.toLocaleString()} 条论文-方向关联。
        </div>
      )}

      <section className="admin-status-strip">
        <StatCard label="预置方向" value={data?.seed.nodes ?? 0} sub={data?.sourceVersion || '-'} />
        <StatCard label="当前方向库" value={data?.database.nodes ?? 0} sub={`${data?.database.aliases ?? 0} 个别名`} />
        <StatCard label="关键词规则" value={data?.database.keywordRules ?? 0} sub="正向 / 负向" />
        <StatCard label="论文-方向关联" value={data?.database.paperEdges ?? 0} sub="分类器输出" />
      </section>

      <section className="admin-grid">
        <div className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>分类库</span>
              <h2>后台方向分类</h2>
            </div>
            <button type="button" onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? '同步中...' : '同步预置分类'}
            </button>
            <button type="button" onClick={() => refreshEdges.mutate()} disabled={refreshEdges.isPending}>
              {refreshEdges.isPending ? '刷新中...' : '刷新论文方向关联'}
            </button>
          </div>
          <p className="learning-muted">
            公共方向接口优先读取后台分类库；只有当前库为空时才回退到预置分类。这样人工校正和论文-方向关联生成
            可以在后台完成，不需要重新发布代码。
          </p>

          <div className="admin-ops">
            {tree.map((node) => (
              <article key={node.id} className="admin-op admin-op-ready">
                <div className="admin-op-head">
                  <span>{node.domain}</span>
                  <strong>{node.children?.length || 0}</strong>
                </div>
                <h3>{node.label}</h3>
                <p>{node.aliases.slice(0, 4).join(', ') || '暂无别名'}</p>
                <div className="company-tags">
                  {node.children?.slice(0, 6).map((child) => <em key={child.id}>{child.label}</em>)}
                </div>
              </article>
            ))}
            {!tree.length && <p className="learning-muted">正在加载主题树...</p>}
          </div>
        </div>

        <aside className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>差异</span>
              <h2>预置与当前库</h2>
            </div>
          </div>
          <ul className="admin-mini-list">
            <li><span>当前库缺失</span><small>{data?.drift.missingInDb.length ?? 0}</small></li>
            <li><span>当前库额外项</span><small>{data?.drift.extraInDb.length ?? 0}</small></li>
            <li><span>生成时间</span><small>{data?.generatedAt || '-'}</small></li>
          </ul>
          <div className="mt-4">
            <h3 className="font-semibold text-ink-text mb-2">关键工作</h3>
            <ul className="admin-mini-list">
              {(data?.next || []).map((item) => <li key={item}><span>{item}</span></li>)}
            </ul>
          </div>
          {refreshEdges.data?.topTopics?.length ? (
            <div className="mt-4">
              <h3 className="font-semibold text-ink-text mb-2">最近方向关联分布</h3>
              <ul className="admin-mini-list">
                {refreshEdges.data.topTopics.map((topic) => (
                  <li key={topic.topicId}><span>{topic.label}</span><small>{topic.count.toLocaleString()}</small></li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  )
}
