import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { providerLabel } from '../utils/displayLabels'
import { friendlyError } from '../utils/errorMessages'

function statusLabel(status?: boolean) {
  return status ? '在线' : '离线'
}

const fallbackIndexLabels: Record<string, string> = {
  papers: '论文索引',
  companies: '企业索引',
  learning_routes: '学习路线索引',
}

export default function SearchIndexAdminPage() {
  const queryClient = useQueryClient()
  const status = useQuery({
    queryKey: ['search-index'],
    queryFn: () => api.searchIndexStatus(),
    refetchInterval: 30_000,
  })

  const rebuild = useMutation({
    mutationFn: (target: string) => api.rebuildSearchIndex(target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-index'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    },
  })

  const data = status.data
  const indexLabels = new Map((data?.indexes || []).map((index) => [index.uid, index.label]))
  const indexLabel = (uid: string) => indexLabels.get(uid as any) || fallbackIndexLabels[uid] || uid

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <span>搜索索引</span>
          <h1>搜索索引控制台</h1>
          <p>
            可选接入 Meilisearch 作为生产搜索适配；未配置外部搜索时，站点继续使用本地全文索引兜底。
          </p>
        </div>
        <div className={`admin-health ${data?.reachable ? 'admin-health-ok' : 'admin-health-warn'}`}>
          <strong>{data?.provider ? providerLabel(data.provider) : '本地索引'}</strong>
          <span>{data?.configured ? statusLabel(data.reachable) : '本地检索可用'}</span>
        </div>
      </section>

      {rebuild.isError && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {friendlyError(rebuild.error, '搜索索引重建失败。')}
        </div>
      )}

      {rebuild.data && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
          已提交重建：{Object.entries(rebuild.data.indexed).map(([key, value]) => `${indexLabel(key)} ${Number(value).toLocaleString()} 条`).join('，')}
        </div>
      )}

      <section className="admin-status-strip">
        <div><span>适配器</span><strong>{providerLabel(data?.provider)}</strong></div>
        <div><span>已配置</span><strong>{data?.configured ? '是' : '否'}</strong></div>
        <div><span>可连接</span><strong>{data ? statusLabel(data.reachable) : '-'}</strong></div>
        <div><span>地址</span><strong>{data?.host || '未设置'}</strong></div>
      </section>

      {!data?.configured && (
        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>兜底模式</span>
              <h2>本地全文索引仍在提供检索</h2>
            </div>
          </div>
          <p className="learning-muted">
            如需启用外部搜索，请先在运维配置中填写搜索适配器地址和访问密钥；未配置时，本地索引会继续提供检索。
          </p>
        </section>
      )}

      <section className="admin-grid">
        <div className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>索引</span>
              <h2>搜索文档</h2>
            </div>
            <button
              type="button"
              disabled={!data?.configured || rebuild.isPending}
              onClick={() => rebuild.mutate('all')}
            >
              {rebuild.isPending ? '重建中...' : '重建全部'}
            </button>
          </div>
          <div className="admin-ops">
            {(data?.indexes || []).map((index) => (
              <article key={index.uid} className={`admin-op ${index.exists ? 'admin-op-ready' : 'admin-op-planned'}`}>
                <div className="admin-op-head">
                  <span>{index.exists ? '已就绪' : '缺失'}</span>
                  <strong>{index.documents.toLocaleString()}</strong>
                </div>
                <h3>{index.label}</h3>
                <p>
                  索引标识：{indexLabel(index.uid)} · 主键：{index.primaryKey}
                  {index.isIndexing ? ' · 索引中' : ''}
                </p>
                <button
                  type="button"
                  disabled={!data?.configured || rebuild.isPending}
                  onClick={() => rebuild.mutate(index.uid)}
                >
                  重建{index.label}
                </button>
              </article>
            ))}
            {!data?.indexes?.length && <p className="learning-muted">正在加载搜索索引状态...</p>}
          </div>
        </div>

        <aside className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>范围</span>
              <h2>已索引实体</h2>
            </div>
          </div>
          <ul className="admin-mini-list">
            <li><span>论文</span><small>标题、摘要、作者、DOI、来源、等级、方向</small></li>
            <li><span>企业</span><small>别名、领域、产品、岗位、地区</small></li>
            <li><span>学习路线</span><small>路线标题、领域、族群、搜索词</small></li>
          </ul>
          <p className="learning-muted">
            外部搜索健康后，可逐步把公共搜索切到该适配器，再补充作者、机构、会议期刊和主题索引。
          </p>
        </aside>
      </section>
    </div>
  )
}
