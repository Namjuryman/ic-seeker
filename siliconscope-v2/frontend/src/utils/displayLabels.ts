export type DisplayLanguage = 'zh' | 'en'

export function paperRankLabel(rank?: string | null, language: DisplayLanguage = 'zh') {
  const raw = String(rank || '').trim()
  if (!raw || raw === '-') return '-'
  const labels: Record<string, Record<DisplayLanguage, string>> = {
    User: { zh: '用户导入', en: 'User import' },
    Hidden: { zh: '降权保留', en: 'De-emphasized' },
    Unknown: { zh: '待映射', en: 'Unmapped' },
    Unranked: { zh: '未定级', en: 'Unranked' },
  }
  return labels[raw]?.[language] || raw
}

function displayValue(value?: string | null) {
  return String(value || '').trim()
}

export function statusLabel(status?: string | null, language: DisplayLanguage = 'zh') {
  const raw = displayValue(status)
  if (!raw) return '-'
  const labels: Record<string, Record<DisplayLanguage, string>> = {
    open: { zh: '待处理', en: 'Open' },
    pending: { zh: '待复核', en: 'Pending' },
    approved: { zh: '已通过', en: 'Approved' },
    rejected: { zh: '已拒绝', en: 'Rejected' },
    resolved: { zh: '已解决', en: 'Resolved' },
    ignored: { zh: '已忽略', en: 'Ignored' },
    visible: { zh: '已公开', en: 'Visible' },
    hidden: { zh: '已隐藏', en: 'Hidden' },
    removed: { zh: '已移除', en: 'Removed' },
    reported: { zh: '已举报', en: 'Reported' },
    queued: { zh: '排队中', en: 'Queued' },
    running: { zh: '运行中', en: 'Running' },
    completed: { zh: '已完成', en: 'Completed' },
    succeeded: { zh: '已成功', en: 'Succeeded' },
    success: { zh: '已成功', en: 'Succeeded' },
    failed: { zh: '失败', en: 'Failed' },
    failure: { zh: '失败', en: 'Failed' },
    cancelled: { zh: '已取消', en: 'Cancelled' },
    review_required: { zh: '需要复核', en: 'Review required' },
    auto: { zh: '自动候选', en: 'Automatic candidate' },
    merged: { zh: '已合并', en: 'Merged' },
    split_required: { zh: '需要拆分', en: 'Split required' },
    fresh: { zh: '新鲜', en: 'Fresh' },
    stale: { zh: '需刷新', en: 'Stale' },
    unknown: { zh: '未知', en: 'Unknown' },
  }
  return labels[raw]?.[language] || raw
}

export function sourceLabel(source?: string | null, language: DisplayLanguage = 'zh') {
  const raw = displayValue(source)
  if (!raw) return '-'
  const labels: Record<string, Record<DisplayLanguage, string>> = {
    manual: { zh: '人工维护', en: 'Manual' },
    'candidate-review': { zh: '候选复核', en: 'Candidate review' },
    crawler: { zh: '采集线索', en: 'Crawler signal' },
    import: { zh: '导入数据', en: 'Imported' },
    'rule-local': { zh: '本地规则', en: 'Local rules' },
    heuristic: { zh: '启发式线索', en: 'Heuristic' },
    local: { zh: '本地来源', en: 'Local' },
  }
  return labels[raw]?.[language] || raw
}

export function targetTypeLabel(type?: string | null, language: DisplayLanguage = 'zh') {
  const raw = displayValue(type)
  if (!raw) return '-'
  const labels: Record<string, Record<DisplayLanguage, string>> = {
    paper: { zh: '论文', en: 'Paper' },
    papers: { zh: '论文', en: 'Papers' },
    author: { zh: '作者', en: 'Author' },
    institution: { zh: '机构', en: 'Institution' },
    company: { zh: '企业', en: 'Company' },
    venue: { zh: '会议/期刊', en: 'Venue' },
    topic: { zh: '方向', en: 'Topic' },
    doi: { zh: 'DOI', en: 'DOI' },
    paper_group: { zh: '论文分组', en: 'Paper group' },
    database: { zh: '数据库', en: 'Database' },
    search: { zh: '保存搜索', en: 'Saved search' },
    paper_comment: { zh: '论文评论', en: 'Paper comment' },
    mentor_review: { zh: '研究者评价', en: 'Researcher review' },
    professor_review: { zh: '研究者评价', en: 'Researcher review' },
    roadmap: { zh: '学习路线', en: 'Roadmap' },
    lesson: { zh: '课程', en: 'Lesson' },
  }
  return labels[raw]?.[language] || raw
}

export function providerLabel(provider?: string | null, language: DisplayLanguage = 'zh') {
  const raw = displayValue(provider)
  if (!raw) return '-'
  const labels: Record<string, Record<DisplayLanguage, string>> = {
    sqlite: { zh: '本地 SQLite', en: 'Local SQLite' },
    postgres: { zh: 'PostgreSQL', en: 'PostgreSQL' },
    'postgres-planned': { zh: 'PostgreSQL 计划接入', en: 'PostgreSQL planned' },
    redis: { zh: 'Redis', en: 'Redis' },
    'redis-planned': { zh: 'Redis 计划接入', en: 'Redis planned' },
    memory: { zh: '内存缓存', en: 'In-memory' },
    local: { zh: '本地文件', en: 'Local files' },
    disabled: { zh: '未启用', en: 'Disabled' },
    stripe: { zh: 'Stripe', en: 'Stripe' },
    paddle: { zh: 'Paddle', en: 'Paddle' },
    s3: { zh: 'S3 兼容对象存储', en: 'S3-compatible storage' },
    meilisearch: { zh: 'Meilisearch', en: 'Meilisearch' },
    opensearch: { zh: 'OpenSearch', en: 'OpenSearch' },
    elasticsearch: { zh: 'Elasticsearch', en: 'Elasticsearch' },
    openalex: { zh: 'OpenAlex', en: 'OpenAlex' },
    crossref: { zh: 'Crossref', en: 'Crossref' },
    ieee: { zh: 'IEEE', en: 'IEEE' },
    'semantic-scholar': { zh: 'Semantic Scholar', en: 'Semantic Scholar' },
    dblp: { zh: 'DBLP', en: 'DBLP' },
    csv: { zh: 'CSV 导入', en: 'CSV import' },
    'scholar-csv': { zh: 'Scholar CSV', en: 'Scholar CSV' },
    aminer: { zh: 'AMiner', en: 'AMiner' },
    pdf: { zh: 'PDF 元数据', en: 'PDF metadata' },
    manual: { zh: '人工登记', en: 'Manual' },
    'rule-local': { zh: '本地规则', en: 'Local rules' },
    'openai-compatible': { zh: 'OpenAI 兼容接口', en: 'OpenAI-compatible' },
  }
  return labels[raw]?.[language] || raw
}

export function aiModelLabel(model?: string | null, language: DisplayLanguage = 'zh') {
  const raw = displayValue(model)
  if (!raw || raw === 'heuristic-v1') return language === 'zh' ? '本地规则标注' : 'Local rule annotation'
  if (raw === 'rule-local') return language === 'zh' ? '本地规则' : 'Local rules'
  return raw
}

export function downloadStatusLabel(status?: string | null, language: DisplayLanguage = 'zh') {
  const raw = displayValue(status)
  if (!raw) return '-'
  const labels: Record<string, Record<DisplayLanguage, string>> = {
    metadata_only: { zh: '仅元数据', en: 'Metadata only' },
    publisher_pdf_requires_session: { zh: '出版方 PDF 链接', en: 'Publisher PDF link' },
    local_pdf_matched: { zh: '本地 PDF 已匹配', en: 'Local PDF matched' },
    local_pdf: { zh: '本地 PDF', en: 'Local PDF' },
    unavailable: { zh: '全文不可用', en: 'Unavailable' },
    unknown: { zh: '状态待核验', en: 'Unknown' },
  }
  return labels[raw]?.[language] || raw
}

export function collectionMethodLabel(method?: string | null, language: DisplayLanguage = 'zh') {
  const raw = displayValue(method)
  if (!raw) return '-'
  const sourceLabels: Record<string, Record<DisplayLanguage, string>> = {
    csv_seed: { zh: 'CSV 初始导入', en: 'CSV seed' },
    manual_import: { zh: '人工导入', en: 'Manual import' },
    crossref_doi_import: { zh: 'Crossref DOI 导入', en: 'Crossref DOI import' },
    openalex: { zh: 'OpenAlex', en: 'OpenAlex' },
    crossref: { zh: 'Crossref', en: 'Crossref' },
    dblp: { zh: 'DBLP', en: 'DBLP' },
    ieee: { zh: 'IEEE', en: 'IEEE' },
    aminer: { zh: 'AMiner', en: 'AMiner' },
    pdf: { zh: 'PDF 元数据', en: 'PDF metadata' },
    test_seed: { zh: '测试种子数据', en: 'Test seed' },
    'openalex-issn': { zh: 'OpenAlex ISSN 回填', en: 'OpenAlex ISSN backfill' },
  }
  const renderOne = (value: string) => sourceLabels[value]?.[language] || providerLabel(value, language)
  if (raw.startsWith('multisource:')) {
    const parts = raw.replace(/^multisource:/, '').split('+').map((part) => part.trim()).filter(Boolean)
    return `${language === 'zh' ? '多源' : 'Multi-source'}：${parts.map(renderOne).join(' + ') || raw}`
  }
  if (raw.startsWith('backfill:')) {
    const parts = raw.replace(/^backfill:/, '').split('+').map((part) => part.trim()).filter(Boolean)
    return `${language === 'zh' ? '回填' : 'Backfill'}：${parts.map(renderOne).join(' + ') || raw}`
  }
  if (raw.includes('+')) {
    return raw.split('+').map((part) => renderOne(part.trim())).filter(Boolean).join(' + ')
  }
  return renderOne(raw)
}

export function verificationStatusLabel(status?: string | null, language: DisplayLanguage = 'zh') {
  const raw = displayValue(status)
  if (!raw) return '-'
  const labels: Record<string, Record<DisplayLanguage, string>> = {
    doi_verified: { zh: 'DOI 已核验', en: 'DOI verified' },
    doi_format_verified: { zh: 'DOI 格式已核验', en: 'DOI format verified' },
    metadata_trusted: { zh: '多源元数据可信', en: 'Trusted metadata' },
    metadata_imported: { zh: '元数据导入', en: 'Metadata imported' },
    user_entered: { zh: '用户录入', en: 'User entered' },
    unverified: { zh: '待核验', en: 'Unverified' },
    test_seed: { zh: '测试种子数据', en: 'Test seed' },
    verified: { zh: '已核验', en: 'Verified' },
    pending: { zh: '待复核', en: 'Pending' },
    candidate: { zh: '候选线索', en: 'Candidate' },
  }
  return labels[raw]?.[language] || raw
}

export function localPdfMatchStatusLabel(status?: string | null, language: DisplayLanguage = 'zh') {
  const raw = displayValue(status)
  if (!raw) return '-'
  const labels: Record<string, Record<DisplayLanguage, string>> = {
    matched: { zh: '已匹配论文', en: 'Matched' },
    candidate: { zh: '候选匹配', en: 'Candidate' },
    unmatched: { zh: '未匹配', en: 'Unmatched' },
    ignored: { zh: '已忽略', en: 'Ignored' },
  }
  return labels[raw]?.[language] || raw
}
