import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { paperRankLabel, targetTypeLabel } from '../utils/displayLabels'
import { searchPath } from '../utils/routes'
import type { WatchlistItem } from '../types'

function typeIcon(type: string): string {
  switch (type) {
    case 'company': return '企'
    case 'search': return '搜'
    case 'paper': return '论'
    case 'author': return '作'
    case 'institution': return '机'
    case 'topic': return '向'
    case 'venue': return '会'
    case 'roadmap': return '路'
    case 'lesson': return '课'
    default: return '•'
  }
}

const searchParamLabels: Record<string, string> = {
  q: '关键词',
  venue: '会议/期刊',
  field: '方向',
  rank: '等级',
  yearFrom: '起始年份',
  yearTo: '结束年份',
  sort: '排序',
  semantic: '语义扩展',
  hasPdf: '本地 PDF',
  favorite: '收藏',
  author: '作者',
  institution: '机构',
  country: '国家/地区',
  minScore: '最低排序信号',
  minCitations: '最低引用',
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}

function searchParamValueLabel(key: string, value: string) {
  if (key === 'rank') return paperRankLabel(value)
  if (key === 'semantic' || key === 'hasPdf' || key === 'favorite') {
    return value === '1' || value === 'true' ? '是' : value === '0' || value === 'false' ? '否' : value
  }
  return value
}

function SearchCard({ item, onDelete }: { item: WatchlistItem & { queryJsonObj?: Record<string, unknown>; href: string }; onDelete: () => void }) {
  const q = (item.queryJsonObj?.q as string) || ''
  const params: Record<string, string> = {}
  if (item.queryJsonObj) {
    for (const [key, value] of Object.entries(item.queryJsonObj)) {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value)
      }
    }
  }
  const label = q || Object.entries(params).map(([k, v]) => `${searchParamLabels[k] || k}=${searchParamValueLabel(k, v)}`).slice(0, 3).join(', ') || '保存的搜索'

  return (
    <div className="flex items-center gap-4 py-3 hover:bg-surface-elevated transition-colors px-2 rounded-lg group">
      <div className="w-10 h-10 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center text-sm font-bold text-brand-600">
        S
      </div>
      <div className="flex-1 min-w-0">
        <Link to={searchPath(params)} className="text-sm font-medium text-ink-text hover:text-brand-600 truncate block">
          {label}
        </Link>
        <div className="text-xs text-ink-muted truncate">
          {Object.entries(params).filter(([k]) => k !== 'q').slice(0, 4).map(([k, v]) => `${searchParamLabels[k] || k}: ${searchParamValueLabel(k, v)}`).join(' · ') || '未设置筛选'}
        </div>
      </div>
      <button
        className="text-xs text-ink-muted hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onDelete}
        title="移除"
      >
        移除
      </button>
    </div>
  )
}

function TypedItemCard({ item, onDelete }: { item: WatchlistItem & { title: string; href: string; [key: string]: any }; onDelete: () => void }) {
  const canLink = item.href !== ''

  return (
    <div className="flex items-center gap-4 py-3 hover:bg-surface-elevated transition-colors px-2 rounded-lg group">
      <div className="w-10 h-10 rounded-full bg-surface-elevated border border-line flex items-center justify-center text-lg">
        {typeIcon(item.targetType)}
      </div>
      <div className="flex-1 min-w-0">
        {canLink ? (
          <Link to={item.href} className="text-sm font-medium text-ink-text hover:text-brand-600 truncate block">
            {item.title}
          </Link>
        ) : (
          <div className="text-sm font-medium text-ink-text truncate">{item.title}</div>
        )}
        <div className="text-xs text-ink-muted truncate">
          {targetTypeLabel(item.targetType)} · {formatDate(item.createdAt)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canLink && (
          <Link
            to={item.href}
            className="text-xs text-brand-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
          >
            查看
          </Link>
        )}
        <button
          className="text-xs text-ink-muted hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onDelete}
          title="移除"
        >
          移除
        </button>
      </div>
    </div>
  )
}

function PaperCard({ item, onDelete }: { item: WatchlistItem & { title: string; venue: string; year: number | null; rank: string; field: string; score: number | null; href: string }; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-4 py-3 hover:bg-surface-elevated transition-colors px-2 rounded-lg group">
      <div className="w-10 h-10 rounded-full bg-surface-elevated border border-line flex items-center justify-center text-lg">
        P
      </div>
      <div className="flex-1 min-w-0">
        <Link to={item.href} className="text-sm font-medium text-ink-text hover:text-brand-600 truncate block">
          {item.title}
        </Link>
        <div className="text-xs text-ink-muted truncate">
          {item.venue} · {item.year ?? '-'} · {paperRankLabel(item.rank)} · {item.field}
          {item.score !== null && ` · 排序信号 ${item.score}`}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link to={item.href} className="text-xs text-brand-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
          查看
        </Link>
        <button
          className="text-xs text-ink-muted hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onDelete}
          title="移除"
        >
          移除
        </button>
      </div>
    </div>
  )
}

function CompanyCard({ item, onDelete }: { item: WatchlistItem & { title: string; subtitle: string; country: string; city: string; dataConfidence?: number; href: string }; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-4 py-3 hover:bg-surface-elevated transition-colors px-2 rounded-lg group">
      <div className="w-10 h-10 rounded-full bg-surface-elevated border border-line flex items-center justify-center text-sm font-bold text-ink-secondary">
        {(item.title || 'C').slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <Link to={item.href} className="text-sm font-medium text-ink-text hover:text-brand-600 truncate block">
          {item.title}
        </Link>
        <div className="text-xs text-ink-muted truncate">
          {item.subtitle || '未标注类型'} · {item.country || '未标注地区'}
        </div>
      </div>
      <div className="text-xs text-ink-secondary whitespace-nowrap">
        {item.dataConfidence !== undefined ? `来源可信度 ${item.dataConfidence}%` : '-'}
      </div>
      <button
        className="text-xs text-ink-muted hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onDelete}
        title="移除"
      >
        移除
      </button>
    </div>
  )
}

export default function WatchlistPage() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')

  const watchlist = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => api.watchlistItems(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteWatchlistItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      setMessage('已移除')
      setTimeout(() => setMessage(''), 1400)
    },
  })

  const data = watchlist.data
  const companies = data?.companies || []
  const searches = data?.searches || []
  const papers = data?.papers || []
  const authors = data?.authors || []
  const institutions = data?.institutions || []
  const topics = data?.topics || []
  const venues = data?.venues || []
  const roadmaps = data?.roadmaps || []
  const lessons = data?.lessons || []

  const totalItems =
    companies.length + searches.length + papers.length + authors.length +
    institutions.length + topics.length + venues.length + roadmaps.length + lessons.length

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">个人工作台</p>
          <h1 className="text-2xl font-bold text-ink-text mt-0.5">关注中心</h1>
          <p className="text-sm text-ink-muted mt-1">
            你关注了 {totalItems} 个对象。在这里集中管理公司、搜索、论文、作者、机构、方向和学习内容。
          </p>
          <p className="text-xs text-ink-subtle mt-2">
            关注项只是个人工作区入口；作者、机构和企业信息仍以原始来源与详情页说明为准。
          </p>
        </div>
      </section>

      {message && (
        <div className="rounded-xl border p-3 text-sm bg-emerald-50 text-emerald-700 border-emerald-100">
          {message}
        </div>
      )}

      {watchlist.isLoading && (
        <p className="text-sm text-ink-muted">正在加载关注内容...</p>
      )}

      {!watchlist.isLoading && totalItems === 0 && (
        <div className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm text-sm text-ink-muted">
          暂无关注内容。在搜索页面保存搜索条件，或在公司/作者/论文详情页添加关注。
        </div>
      )}

      {/* Watched Companies */}
      {companies.length > 0 && (
        <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">企业</p>
              <h2 className="text-lg font-bold text-ink-text">关注企业</h2>
            </div>
            <span className="text-xs text-ink-muted">{companies.length} 家</span>
          </div>
          <div className="divide-y divide-line-subtle">
            {companies.map((item) => (
              <CompanyCard key={item.id} item={item} onDelete={() => deleteMutation.mutate(item.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Saved Searches */}
      {searches.length > 0 && (
        <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">搜索</p>
              <h2 className="text-lg font-bold text-ink-text">保存搜索</h2>
            </div>
            <span className="text-xs text-ink-muted">{searches.length} 条</span>
          </div>
          <div className="divide-y divide-line-subtle">
            {searches.map((item) => (
              <SearchCard key={item.id} item={item} onDelete={() => deleteMutation.mutate(item.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Watched Papers */}
      {papers.length > 0 && (
        <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">论文</p>
              <h2 className="text-lg font-bold text-ink-text">关注论文</h2>
            </div>
            <span className="text-xs text-ink-muted">{papers.length} 篇</span>
          </div>
          <div className="divide-y divide-line-subtle">
            {papers.map((item) => (
              <PaperCard key={item.id} item={item} onDelete={() => deleteMutation.mutate(item.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Watched Authors */}
      {authors.length > 0 && (
        <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">作者</p>
              <h2 className="text-lg font-bold text-ink-text">关注作者</h2>
            </div>
            <span className="text-xs text-ink-muted">{authors.length} 位</span>
          </div>
          <div className="divide-y divide-line-subtle">
            {authors.map((item) => (
              <TypedItemCard key={item.id} item={item} onDelete={() => deleteMutation.mutate(item.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Watched Institutions */}
      {institutions.length > 0 && (
        <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">机构</p>
              <h2 className="text-lg font-bold text-ink-text">关注机构</h2>
            </div>
            <span className="text-xs text-ink-muted">{institutions.length} 个</span>
          </div>
          <div className="divide-y divide-line-subtle">
            {institutions.map((item) => (
              <TypedItemCard key={item.id} item={item} onDelete={() => deleteMutation.mutate(item.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Watched Topics */}
      {topics.length > 0 && (
        <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">方向</p>
              <h2 className="text-lg font-bold text-ink-text">关注方向</h2>
            </div>
            <span className="text-xs text-ink-muted">{topics.length} 个</span>
          </div>
          <div className="divide-y divide-line-subtle">
            {topics.map((item) => (
              <TypedItemCard key={item.id} item={item} onDelete={() => deleteMutation.mutate(item.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Watched Venues */}
      {venues.length > 0 && (
        <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">会议/期刊</p>
              <h2 className="text-lg font-bold text-ink-text">关注会议/期刊</h2>
            </div>
            <span className="text-xs text-ink-muted">{venues.length} 个</span>
          </div>
          <div className="divide-y divide-line-subtle">
            {venues.map((item) => (
              <TypedItemCard key={item.id} item={item} onDelete={() => deleteMutation.mutate(item.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Learning Items */}
      {(roadmaps.length > 0 || lessons.length > 0) && (
        <section className="bg-surface-panel border border-line rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">学习</p>
              <h2 className="text-lg font-bold text-ink-text">学习内容</h2>
            </div>
            <span className="text-xs text-ink-muted">{roadmaps.length + lessons.length} 个</span>
          </div>
          <div className="divide-y divide-line-subtle">
            {roadmaps.map((item) => (
              <TypedItemCard key={item.id} item={item} onDelete={() => deleteMutation.mutate(item.id)} />
            ))}
            {lessons.map((item) => (
              <TypedItemCard key={item.id} item={item} onDelete={() => deleteMutation.mutate(item.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
