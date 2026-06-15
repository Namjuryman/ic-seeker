const state = {
  authenticated: false,
  authEnabled: false,
  language: localStorage.getItem('icSeekerLanguage') || 'zh',
  navCollapsed: localStorage.getItem('icSeekerNavCollapsed') === '1',
  detailCollapsed: true,
  stats: null,
  methodology: null,
  pdfInbox: null,
  apiKeys: [],
  professors: [],
  institutions: [],
  rows: [],
  activeId: null,
  activePaper: null,
  resultMeta: null,
  view: 'comfort',
  page: 1,
  limit: 30,
  total: 0
};

const i18n = {
  en: {
    navSearch: 'Academic Search',
    navAuthors: 'Scholars',
    navInstitutions: 'Institutions',
    navSources: 'Data Sources',
    navPdfs: 'Local PDFs',
    navPrivate: 'Private IC intelligence',
    tagline: 'IC paper, scholar, and institution intelligence',
    scopeAll: 'All',
    scopePapers: 'Papers',
    scopeAuthors: 'Authors',
    searchPlaceholder: 'Search papers, circuits, authors, DOI...',
    search: 'Search',
    semantic: 'Semantic',
    sortRelevance: 'Relevance',
    sortScore: 'Score',
    sortYear: 'Year',
    sortCitations: 'Citations',
    sortTitle: 'Title',
    logout: 'Log out',
    tabPapers: 'Papers',
    tabAuthors: 'Authors',
    tabInstitutions: 'Institutions',
    rows: 'Rows',
    table: 'Table',
    filters: 'Filters',
    reset: 'Reset',
    venue: 'Venue',
    domain: 'Domain',
    rank: 'Rank',
    from: 'From',
    to: 'To',
    hasPdf: 'Has local PDF',
    favoriteOnly: 'Favorites only',
    status: 'Status',
    tag: 'Tag',
    dataSources: 'Data sources',
    paperImport: 'Paper import',
    import: 'Import',
    manualMetadata: 'Manual metadata',
    addPaper: 'Add paper',
    apiKeys: 'API keys',
    saveKey: 'Save key',
    localPdfInbox: 'Local PDF inbox',
    downloadCsv: 'Download CSV',
    selectPaper: 'Select a paper to inspect abstract, DOI, score, PDF status, notes, and tags.',
    insight: 'Scholar and institution insight',
    statsRows: 'Database rows',
    statsAminer: 'AMiner rows',
    statsPdfs: 'Local PDFs',
    statsFavorites: 'Favorites',
    statsNotes: 'Notes',
    statsYears: 'Year range',
    summaryPapers: 'Papers',
    summaryPdfs: 'Local PDFs',
    summaryFavorites: 'Favorites',
    summaryTopVenue: 'Top Venue',
    summaryTopField: 'Top Field',
    matches: 'matches',
    page: 'Page',
    of: 'of',
    previous: 'Previous',
    next: 'Next',
    openDoi: 'Open DOI',
    openPdf: 'Open PDF Link',
    source: 'Source',
    authors: 'Authors',
    collectedBy: 'Collected by',
    pdfStatus: 'PDF status',
    localPdf: 'Local PDF',
    articleNo: 'Article no.',
    affiliations: 'Affiliations',
    abstract: 'Abstract',
    favorite: 'Favorite',
    readingState: 'Status',
    tags: 'Tags',
    notes: 'Notes',
    saveReading: 'Save reading state',
    noAbstract: 'No abstract available.',
    sourceHint: 'AMiner is kept as targeted enrichment so full crawls do not burn quota.',
    collapseDetail: 'Collapse detail',
    expandDetail: 'Expand detail'
  },
  zh: {
    navSearch: '学术搜索',
    navAuthors: '学者画像',
    navInstitutions: '机构实力',
    navSources: '数据来源',
    navPdfs: '本地 PDF',
    navPrivate: '私人 IC 情报库',
    tagline: 'IC 论文、学者与机构知识库',
    scopeAll: '全部',
    scopePapers: '论文',
    scopeAuthors: '作者',
    searchPlaceholder: '搜索论文、电路方向、作者、DOI...',
    search: '搜索',
    semantic: '语义',
    sortRelevance: '综合',
    sortScore: '评分',
    sortYear: '年份',
    sortCitations: '引用',
    sortTitle: '标题',
    logout: '退出',
    tabPapers: '论文',
    tabAuthors: '专家',
    tabInstitutions: '机构',
    rows: '列表',
    table: '紧凑',
    filters: '筛选',
    reset: '重置',
    venue: '会议/期刊',
    domain: '方向',
    rank: '等级',
    from: '起始',
    to: '结束',
    hasPdf: '有本地 PDF',
    favoriteOnly: '只看收藏',
    status: '阅读状态',
    tag: '标签',
    dataSources: '数据来源',
    paperImport: '论文导入',
    import: '导入',
    manualMetadata: '手动录入',
    addPaper: '添加论文',
    apiKeys: 'API 密钥',
    saveKey: '保存密钥',
    localPdfInbox: '本地 PDF 接入',
    downloadCsv: '下载 CSV',
    selectPaper: '选择一篇论文查看摘要、DOI、评分、PDF 状态、笔记和标签。',
    insight: '学者与机构画像',
    statsRows: '数据库论文',
    statsAminer: 'AMiner 行数',
    statsPdfs: '本地 PDF',
    statsFavorites: '收藏',
    statsNotes: '笔记',
    statsYears: '年份范围',
    summaryPapers: '论文',
    summaryPdfs: '本地 PDF',
    summaryFavorites: '收藏',
    summaryTopVenue: '最多来源',
    summaryTopField: '热门方向',
    matches: '条结果',
    page: '第',
    of: '页，共',
    previous: '上一页',
    next: '下一页',
    openDoi: '打开 DOI',
    openPdf: '打开 PDF 链接',
    source: '来源',
    authors: '作者',
    collectedBy: '采集来源',
    pdfStatus: 'PDF 状态',
    localPdf: '本地 PDF',
    articleNo: '文章号',
    affiliations: '机构',
    abstract: '摘要',
    favorite: '收藏',
    readingState: '阅读状态',
    tags: '标签',
    notes: '笔记',
    saveReading: '保存阅读状态',
    noAbstract: '暂无摘要。',
    sourceHint: 'AMiner 保持按需增强，避免全量抓取烧额度。',
    collapseDetail: '收起详情',
    expandDetail: '展开详情'
  }
};

function t(key) {
  return i18n[state.language]?.[key] || i18n.en[key] || key;
}

const quickTopics = [
  ['ADC', 'adc'],
  ['PLL', 'pll'],
  ['DC-DC', 'dcdc'],
  ['LDO', 'ldo'],
  ['RF', 'rf'],
  ['SerDes', 'serdes'],
  ['SRAM', 'sram'],
  ['Bandgap', 'bandgap']
];

const $ = id => document.getElementById(id);

function fmt(n) {
  return new Intl.NumberFormat().format(n || 0);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function cleanDisplayText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\$?\\mu\$?/g, 'u')
    .replace(/\$?\\Omega\$?/g, 'ohm')
    .replace(/\$?\\Delta\$?/g, 'Delta')
    .replace(/\$?\\sigma\$?/g, 'sigma')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function optionList(el, values, label = 'All') {
  el.innerHTML = `<option value="">${label}</option>` + values.map(v => `<option>${escapeHtml(v)}</option>`).join('');
}

function textSnippet(value, max = 240) {
  const text = cleanDisplayText(value);
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
    ...options
  });
  if (res.status === 401) {
    if (state.authEnabled) showLogin('Session expired. Please log in again.');
    throw new Error('Authentication required');
  }
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed.error || text;
    } catch {
      message = text;
    }
    throw new Error(message);
  }
  return await res.json();
}

function showLogin(message = '') {
  state.authenticated = false;
  state.authEnabled = true;
  $('loginScreen').hidden = false;
  $('appShell').hidden = true;
  $('loginError').textContent = message;
  $('password').focus();
}

function showApp() {
  state.authenticated = true;
  $('loginScreen').hidden = true;
  $('appShell').hidden = false;
}

function params() {
  const p = new URLSearchParams();
  for (const id of ['q', 'venue', 'field', 'rank', 'yearFrom', 'yearTo', 'sort']) {
    const value = $(id).value.trim();
    if (value) p.set(id, value);
  }
  if ($('hasPdf').checked) p.set('hasPdf', '1');
  if ($('favoriteOnly').checked) p.set('favorite', '1');
  if ($('semantic').checked) p.set('semantic', '1');
  if ($('statusFilter').value) p.set('status', $('statusFilter').value);
  if ($('tagFilter').value) p.set('tag', $('tagFilter').value);
  p.set('limit', String(state.limit));
  p.set('offset', String((state.page - 1) * state.limit));
  return p;
}

function applyLanguage() {
  document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  });
  document.querySelectorAll('option[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  $('languageToggle').textContent = state.language === 'zh' ? 'EN' : '中文';
  $('navCollapse').setAttribute('aria-label', state.navCollapsed
    ? (state.language === 'zh' ? '展开导航' : 'Expand navigation')
    : (state.language === 'zh' ? '收起导航' : 'Collapse navigation'));
  $('detailCollapse').setAttribute('aria-label', state.detailCollapsed ? t('expandDetail') : t('collapseDetail'));
}

function applyNavState() {
  document.body.classList.toggle('nav-collapsed', state.navCollapsed);
  $('navCollapse').textContent = state.navCollapsed ? '>' : '<';
  $('navCollapse').style.left = state.navCollapsed ? '4px' : '216px';
  localStorage.setItem('icSeekerNavCollapsed', state.navCollapsed ? '1' : '0');
  applyLanguage();
}

function applyDetailState() {
  document.body.classList.toggle('detail-collapsed', state.detailCollapsed);
  $('detailCollapse').textContent = state.detailCollapsed ? '<' : '>';
  $('detailCollapse').setAttribute('aria-label', state.detailCollapsed ? t('expandDetail') : t('collapseDetail'));
}

function renderEmptyDetail() {
  state.activeId = null;
  state.activePaper = null;
  state.detailCollapsed = true;
  $('detail').innerHTML = `<div class="empty">${escapeHtml(t('selectPaper'))}</div>`;
  applyDetailState();
}

async function loadStats() {
  const [stats, methodology, pdfInbox, professors, institutions, apiKeys] = await Promise.all([
    api('/api/stats'),
    api('/api/methodology'),
    api('/api/pdf-inbox'),
    api('/api/professors?limit=12&minPapers=2'),
    api('/api/institutions?limit=12&minPapers=2'),
    api('/api/admin/api-keys')
  ]);
  state.stats = stats;
  state.methodology = methodology;
  state.pdfInbox = pdfInbox;
  state.apiKeys = apiKeys;
  state.professors = professors;
  state.institutions = institutions;
  $('appTitle').textContent = stats.appName || 'IC Seeker';
  optionList($('venue'), state.stats.venues, state.language === 'zh' ? '全部' : 'All');
  optionList($('field'), state.stats.fields, state.language === 'zh' ? '全部' : 'All');
  optionList($('rank'), state.stats.ranks, state.language === 'zh' ? '全部' : 'All');
  optionList($('tagFilter'), (state.stats.tags || []).map(tag => tag.name), state.language === 'zh' ? '全部' : 'All');
  $('stats').innerHTML = [
    [t('statsRows'), fmt(state.stats.total)],
    [t('statsAminer'), fmt(state.stats.aminerRows)],
    [t('statsPdfs'), fmt(state.stats.pdfs)],
    [t('statsFavorites'), fmt(state.stats.favorites)],
    [t('statsNotes'), fmt(state.stats.notes)],
    [t('statsYears'), `${state.stats.years.minYear || '-'}-${state.stats.years.maxYear || '-'}`]
  ].map(([k, v]) => `<div class="stat-row"><span>${k}</span><strong>${v}</strong></div>`).join('');
  $('navTotal').textContent = `${fmt(state.stats.total)} ${state.language === 'zh' ? '篇论文' : 'papers'}`;
  renderApiKeys(apiKeys);
  renderSourceStatus();
  renderSummary();
  renderCoverage();
  renderPdfInbox();
  renderMethodology();
  renderProfessors();
  renderInstitutions();
}

function renderApiKeys(keys) {
  $('apiKeys').innerHTML = keys.length
    ? keys.map(row => `<div class="key-row"><span>${escapeHtml(row.provider)}</span><strong>${escapeHtml(row.masked)}</strong></div>`).join('')
    : '<p class="hint">No keys saved yet.</p>';
}

function hasProvider(keys, names) {
  const set = new Set(keys.map(row => String(row.provider || '').toLowerCase()));
  return names.some(name => set.has(name) || set.has(`${name}_api_key`) || set.has(`${name}_auth_token`));
}

function methodLabel(method) {
  const value = String(method || 'unknown');
  return value
    .replace(/^aminer.*/i, 'AMiner')
    .replace(/^openalex.*/i, 'OpenAlex')
    .replace(/^venue_year_search.*/i, 'OpenAlex')
    .replace(/^crossref.*/i, 'Crossref')
    .replace(/^manual.*/i, 'Manual');
}

function aggregateSources(rows) {
  const totals = new Map();
  for (const row of rows || []) {
    const label = methodLabel(row.method);
    totals.set(label, (totals.get(label) || 0) + Number(row.count || 0));
  }
  return [...totals.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function renderSourceStatus() {
  const keys = state.apiKeys || [];
  const sources = aggregateSources(state.stats?.byCollectionMethod || []);
  const verified = state.stats?.byVerification || [];
  $('sourceStatus').innerHTML = `
    <div class="source-grid">
      <div><span>AMiner</span><strong>${hasProvider(keys, ['aminer']) ? 'ready' : 'on demand'}</strong></div>
      <div><span>IEEE</span><strong>${hasProvider(keys, ['ieee']) ? 'ready' : 'planned'}</strong></div>
    </div>
    <div class="source-list">
      ${sources.slice(0, 5).map(row => `<div class="source-row"><span>${escapeHtml(row.label)}</span><strong>${fmt(row.count)}</strong></div>`).join('')}
    </div>
    <div class="source-list muted-list">
      ${verified.slice(0, 3).map(row => `<div class="source-row"><span>${escapeHtml(row.status)}</span><strong>${fmt(row.count)}</strong></div>`).join('')}
    </div>
    <p class="hint">${escapeHtml(t('sourceHint'))}</p>
  `;
}

function renderSummary() {
  const topVenue = state.stats?.byVenue?.[0];
  const topField = state.stats?.byField?.[0];
  $('summary').innerHTML = [
    [t('summaryPapers'), fmt(state.total || state.stats?.total)],
    [t('summaryPdfs'), fmt(state.stats?.pdfs)],
    [t('summaryFavorites'), fmt(state.stats?.favorites)],
    [t('summaryTopVenue'), topVenue ? `${topVenue.venue} (${fmt(topVenue.count)})` : '-'],
    [t('summaryTopField'), topField ? `${topField.field} (${fmt(topField.count)})` : '-']
  ].map(([k, v]) => `<div class="metric"><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></div>`).join('');
}

function renderCoverage() {
  const rows = state.stats?.byVenueYear || [];
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let year = Number($('yearFrom').value || 2000); year <= Number($('yearTo').value || currentYear); year++) years.push(year);
  const important = ['ISSCC', 'JSSC', 'VLSI Symposium', 'CICC', 'ASSCC', 'ESSCIRC'];
  const byVenue = new Map();
  for (const row of rows) {
    if (!byVenue.has(row.venue)) byVenue.set(row.venue, new Map());
    byVenue.get(row.venue).set(Number(row.year), Number(row.count));
  }
  $('coverage').innerHTML = `
    <h3>Year coverage</h3>
    ${important.map(venue => {
      const map = byVenue.get(venue) || new Map();
      const filled = years.filter(year => map.get(year));
      return `<div class="coverage-row"><span>${escapeHtml(venue)}</span><strong>${filled.length}/${years.length}</strong></div>`;
    }).join('')}
  `;
}

function renderPdfInbox() {
  const inbox = state.pdfInbox;
  $('pdfInbox').innerHTML = `
    <h3>Local PDF inbox</h3>
    <p>${fmt(inbox?.count)} PDFs waiting</p>
    <code>${escapeHtml(inbox?.path || '')}</code>
    <p class="hint">Drop PDFs here, then run ${escapeHtml(inbox?.importCommand || '')}. DOI or IEEE article number in filename is used for matching.</p>
  `;
}

function renderMethodology() {
  const m = state.methodology;
  const base = m?.scoring?.venueBase || {};
  $('methodology').innerHTML = `
    <h3>Scoring and classification</h3>
    <p><strong>Score:</strong> ${escapeHtml(m?.scoring?.formula || '')}</p>
    <p><strong>Semantic:</strong> local FTS plus IC alias expansion; ready for embedding API later.</p>
    <p><strong>Class:</strong> ${escapeHtml(m?.classification?.[0] || '')}</p>
    <div class="base-list">
      ${Object.entries(base).slice(0, 10).map(([k, v]) => `<span>${escapeHtml(k)} ${escapeHtml(v)}</span>`).join('')}
    </div>
  `;
}

function renderProfessors() {
  $('professors').innerHTML = `
    <h3>Author leaderboard</h3>
    <div class="leader-list">
      ${state.professors.map(row => `
        <div class="leader-row clickable" data-author="${escapeHtml(row.name)}">
          <span title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</span>
          <strong>${escapeHtml(row.authorScore)}</strong>
          <em>${fmt(row.papers)} papers, ${fmt(row.sPlus)} S+</em>
        </div>
      `).join('')}
    </div>
    <p class="hint">Name-based for now; institution or ORCID disambiguation is the next serious step.</p>
  `;
  document.querySelectorAll('[data-author]').forEach(el => el.addEventListener('click', () => loadAuthor(el.dataset.author)));
}

function renderInstitutions() {
  $('institutions').innerHTML = `
    <h3>Institution leaderboard</h3>
    <div class="leader-list">
      ${state.institutions.map(row => `
        <div class="leader-row clickable" data-institution="${escapeHtml(row.name)}">
          <span title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</span>
          <strong>${escapeHtml(row.institutionScore)}</strong>
          <em>${fmt(row.papers)} papers, ${fmt(row.sPlus)} S+</em>
        </div>
      `).join('')}
    </div>
    <p class="hint">Affiliation strings are source-dependent; school strength gets better with cleaned institution identities.</p>
  `;
  document.querySelectorAll('[data-institution]').forEach(el => el.addEventListener('click', () => loadInstitution(el.dataset.institution)));
}

function renderTopicChips() {
  $('topicChips').innerHTML = quickTopics.map(([label, query]) => (
    `<button class="chip ${$('q').value.trim().toLowerCase() === query ? 'active' : ''}" data-topic="${escapeHtml(query)}" type="button">${escapeHtml(label)}</button>`
  )).join('');
  document.querySelectorAll('[data-topic]').forEach(el => {
    el.addEventListener('click', () => {
      $('q').value = el.dataset.topic;
      $('semantic').checked = true;
      searchFirstPage();
    });
  });
}

function tokenLinks(value, type) {
  const attr = type === 'author' ? 'data-author-link' : 'data-institution-link';
  return String(value || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => `<button class="text-link" ${attr}="${escapeHtml(item)}">${escapeHtml(item)}</button>`)
    .join('<span class="sep">;</span> ') || '-';
}

function renderMiniBars(rows, label = 'count') {
  const max = Math.max(1, ...rows.map(row => Number(row.count || 0)));
  return `<div class="mini-bars">
    ${rows.map(row => `
      <div class="mini-row">
        <span>${escapeHtml(row.key)}</span>
        <div><i style="width:${Math.max(4, Number(row.count || 0) / max * 100)}%"></i></div>
        <strong>${escapeHtml(row.count)} ${escapeHtml(label)}</strong>
      </div>
    `).join('')}
  </div>`;
}

function profilePapers(papers) {
  return `<div class="profile-papers">
    ${papers.slice(0, 80).map(row => `
      <div class="profile-paper" data-id="${row.id}">
        <p>${escapeHtml(cleanDisplayText(row.title))}</p>
        <div class="meta">
          <span class="pill rank">${escapeHtml(row.rank)}</span>
          <span class="pill">${escapeHtml(row.venue)}</span>
          <span class="pill">${escapeHtml(row.field)}</span>
          <span class="pill">${escapeHtml(row.year)}</span>
          <span class="pill">score ${escapeHtml(row.score)}</span>
        </div>
      </div>
    `).join('')}
  </div>`;
}

function bindProfileLinks() {
  document.querySelectorAll('[data-author-link]').forEach(el => el.addEventListener('click', () => loadAuthor(el.dataset.authorLink)));
  document.querySelectorAll('[data-institution-link]').forEach(el => el.addEventListener('click', () => loadInstitution(el.dataset.institutionLink)));
  document.querySelectorAll('.profile-paper').forEach(el => el.addEventListener('click', () => loadPaper(Number(el.dataset.id))));
}

async function loadAuthor(name) {
  const profile = await api(`/api/authors/${encodeURIComponent(name)}`);
  const paperCount = profile.paperCount ?? (Array.isArray(profile.papers) ? profile.papers.length : profile.papers);
  $('detail').innerHTML = `
    <h2>${escapeHtml(profile.name)}</h2>
    <div class="actions">
      <a class="primary" target="_blank" href="${escapeHtml(profile.external.googleScholar)}">Scholar</a>
      <a target="_blank" href="${escapeHtml(profile.external.webSearch)}">Web search</a>
    </div>
    <section class="profile-grid">
      <div class="metric"><span>Author score</span><strong>${escapeHtml(profile.authorScore)}</strong></div>
      <div class="metric"><span>Papers</span><strong>${fmt(paperCount)}</strong></div>
      <div class="metric"><span>S+ / S / A</span><strong>${fmt(profile.ranks.sPlus)} / ${fmt(profile.ranks.s)} / ${fmt(profile.ranks.a)}</strong></div>
      <div class="metric"><span>Avg score</span><strong>${escapeHtml(profile.avgScore)}</strong></div>
    </section>
    <h3>Yearly strength</h3>${renderMiniBars(profile.byYear, 'papers')}
    <h3>Venues</h3>${renderMiniBars(profile.byVenue, 'papers')}
    <h3>Fields</h3>${renderMiniBars(profile.byDomain, 'papers')}
    <h3>Collaborators</h3>${renderMiniBars(profile.coauthors, 'papers')}
    <h3>Institutions</h3><div class="link-cloud">${tokenLinks(profile.institutions.map(x => x.key).join('; '), 'institution')}</div>
    <h3>Papers</h3>${profilePapers(profile.papers)}
  `;
  bindProfileLinks();
}

async function loadInstitution(name) {
  const profile = await api(`/api/institutions/${encodeURIComponent(name)}`);
  const paperCount = profile.paperCount ?? (Array.isArray(profile.papers) ? profile.papers.length : profile.papers);
  $('detail').innerHTML = `
    <h2>${escapeHtml(profile.name)}</h2>
    <section class="profile-grid">
      <div class="metric"><span>Institution score</span><strong>${escapeHtml(profile.institutionScore)}</strong></div>
      <div class="metric"><span>Papers</span><strong>${fmt(paperCount)}</strong></div>
      <div class="metric"><span>S+ / S / A</span><strong>${fmt(profile.ranks.sPlus)} / ${fmt(profile.ranks.s)} / ${fmt(profile.ranks.a)}</strong></div>
      <div class="metric"><span>Avg score</span><strong>${escapeHtml(profile.avgScore)}</strong></div>
    </section>
    <h3>Yearly strength</h3>${renderMiniBars(profile.byYear, 'papers')}
    <h3>Venues</h3>${renderMiniBars(profile.byVenue, 'papers')}
    <h3>Fields</h3>${renderMiniBars(profile.byDomain, 'papers')}
    <h3>Authors</h3>${renderMiniBars(profile.authors, 'papers')}
    <h3>Papers</h3>${profilePapers(profile.papers)}
  `;
  bindProfileLinks();
}

async function search() {
  $('results').innerHTML = '<div class="loading">Searching local database...</div>';
  const data = await api(`/api/search?${params().toString()}`);
  state.rows = data.rows;
  state.total = data.total;
  state.resultMeta = data;
  renderSummary();
  renderTopicChips();
  renderResults(data.engine);
  renderPagination();
  if (!state.activeId || !state.rows.some(row => row.id === state.activeId)) {
    renderEmptyDetail();
  }
}

function pageWindow(current, total) {
  if (total <= 9) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, 2, total - 1, total]);
  for (let page = current - 2; page <= current + 2; page += 1) {
    if (page >= 1 && page <= total) pages.add(page);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  for (const page of sorted) {
    if (result.length && page - result[result.length - 1] > 1) result.push('gap');
    result.push(page);
  }
  return result;
}

function renderPagination() {
  const pages = Math.max(1, Math.ceil((state.total || 0) / state.limit));
  const start = state.total ? (state.page - 1) * state.limit + 1 : 0;
  const end = Math.min(state.total, state.page * state.limit);
  $('pagination').innerHTML = `
    <button class="button" id="prevPage" type="button" ${state.page <= 1 ? 'disabled' : ''}>${escapeHtml(t('previous'))}</button>
    <div class="page-numbers">
      ${pageWindow(state.page, pages).map(item => item === 'gap'
        ? '<span class="page-gap">...</span>'
        : `<button class="page-button ${item === state.page ? 'active' : ''}" type="button" data-page="${item}">${item}</button>`
      ).join('')}
    </div>
    <span class="page-status">${escapeHtml(t('page'))} ${state.page} ${escapeHtml(t('of'))} ${pages} / ${fmt(start)}-${fmt(end)} ${escapeHtml(t('of'))} ${fmt(state.total)}</span>
    <button class="button" id="nextPage" type="button" ${state.page >= pages ? 'disabled' : ''}>${escapeHtml(t('next'))}</button>
  `;
  $('prevPage').addEventListener('click', () => {
    if (state.page > 1) {
      state.page -= 1;
      search();
    }
  });
  $('nextPage').addEventListener('click', () => {
    if (state.page < pages) {
      state.page += 1;
      search();
    }
  });
  document.querySelectorAll('.page-button[data-page]').forEach(button => {
    button.addEventListener('click', () => {
      const page = Number(button.dataset.page);
      if (page && page !== state.page) {
        state.page = page;
        search();
      }
    });
  });
}

function renderResults(engine = '') {
  if (!state.rows.length) {
    $('results').innerHTML = '<div class="empty">No papers match the current filters.</div>';
    return;
  }
  const expanded = state.resultMeta?.expandedQuery && state.resultMeta.expandedQuery !== state.resultMeta.query
    ? `<span title="${escapeHtml(state.resultMeta.expandedQuery)}">expanded</span>`
    : '';
  $('results').classList.toggle('compact', state.view === 'compact');
  $('results').innerHTML = `
    <div class="result-head">
      <strong>${fmt(state.total)} ${escapeHtml(t('matches'))}</strong>
      ${engine ? `<span>${escapeHtml(engine)}</span>` : ''}
      ${expanded}
    </div>
    ${state.rows.map(row => `
      <div class="paper ${row.id === state.activeId ? 'active' : ''}" data-id="${row.id}">
        <p class="paper-title">${row.favorite ? '<span class="star">*</span>' : ''}${escapeHtml(cleanDisplayText(row.title))}</p>
        <p class="paper-authors">${escapeHtml(textSnippet(row.authors, 170) || 'Unknown authors')}</p>
        <div class="meta">
          <span class="pill rank">${escapeHtml(row.rank)}</span>
          <span class="pill">${escapeHtml(row.venue)}</span>
          <span class="pill">${escapeHtml(row.field)}</span>
          <span class="pill">${escapeHtml(row.year)}</span>
          <span class="pill">score ${escapeHtml(row.score)}</span>
          <span class="pill source">${escapeHtml(methodLabel(row.collectionMethod))}</span>
          <span class="pill">${escapeHtml(row.readingStatus || 'unread')}</span>
          ${row.localPdf ? '<span class="pill pdf">PDF</span>' : ''}
          ${(row.tags || []).map(tag => `<span class="pill tag">${escapeHtml(tag.name)}</span>`).join('')}
        </div>
        <p class="paper-snippet">${escapeHtml(textSnippet(row.abstract || row.field || '', 260))}</p>
        <div class="paper-actions">
          <span>${escapeHtml(t('summaryPapers'))}</span>
          <span>AI</span>
          <span>${escapeHtml(t('favorite'))}</span>
        </div>
      </div>
    `).join('')}
  `;
  document.querySelectorAll('.paper').forEach(el => el.addEventListener('click', () => loadPaper(Number(el.dataset.id))));
}

async function loadPaper(id) {
  state.activeId = id;
  state.detailCollapsed = false;
  applyDetailState();
  renderResults(state.resultMeta?.engine || '');
  const paper = await api(`/api/papers/${id}`);
  state.activePaper = paper;
  const pdfHref = paper.local_pdf || paper.pdf_link || '';
  $('detail').innerHTML = `
    <h2>${escapeHtml(cleanDisplayText(paper.title))}</h2>
    <div class="meta">
      <span class="pill rank">${escapeHtml(paper.venue_rank)}</span>
      <span class="pill">${escapeHtml(paper.venue)}</span>
      <span class="pill">${escapeHtml(paper.domain)}</span>
      <span class="pill">${escapeHtml(paper.year)}</span>
      <span class="pill">score ${escapeHtml(paper.quality_score)}</span>
      <span class="pill">${fmt(paper.citation_count)} citations</span>
      <span class="pill">${escapeHtml(paper.verification_status || 'unverified')}</span>
    </div>
    <div class="actions">
      ${paper.doi ? `<a class="primary" target="_blank" href="https://doi.org/${encodeURIComponent(paper.doi)}">${escapeHtml(t('openDoi'))}</a>` : ''}
      ${pdfHref ? `<a target="_blank" href="${escapeHtml(pdfHref)}">${escapeHtml(t('openPdf'))}</a>` : ''}
      ${paper.source_url ? `<a target="_blank" href="${escapeHtml(paper.source_url)}">${escapeHtml(t('source'))}</a>` : ''}
    </div>
    <dl class="detail-grid">
      <dt>DOI</dt><dd>${escapeHtml(paper.doi || '-')}</dd>
      <dt>${escapeHtml(t('authors'))}</dt><dd>${tokenLinks(paper.authors, 'author')}</dd>
      <dt>${escapeHtml(t('collectedBy'))}</dt><dd>${escapeHtml(paper.collection_method || '-')}</dd>
      <dt>${escapeHtml(t('pdfStatus'))}</dt><dd>${escapeHtml(paper.download_status || '-')}</dd>
      <dt>${escapeHtml(t('localPdf'))}</dt><dd>${escapeHtml(paper.local_pdf || '-')}</dd>
      <dt>${escapeHtml(t('articleNo'))}</dt><dd>${escapeHtml(paper.ieee_article_number || '-')}</dd>
      <dt>${escapeHtml(t('affiliations'))}</dt><dd>${tokenLinks(paper.affiliations, 'institution')}</dd>
    </dl>
    <h3>${escapeHtml(t('abstract'))}</h3>
    <div class="abstract">${escapeHtml(cleanDisplayText(paper.abstract) || t('noAbstract'))}</div>
    <section class="reader-box">
      <label class="check"><input id="paperFavorite" type="checkbox" ${paper.favorite ? 'checked' : ''}><span>${escapeHtml(t('favorite'))}</span></label>
      <label class="field"><span>${escapeHtml(t('readingState'))}</span>
        <select id="paperStatus">
          ${['unread', 'reading', 'read', 'important', 'skip'].map(x => `<option value="${x}" ${paper.readingStatus === x ? 'selected' : ''}>${x}</option>`).join('')}
        </select>
      </label>
      <label class="field"><span>${escapeHtml(t('tags'))}</span><input id="paperTags" value="${escapeHtml((paper.tags || []).map(tag => tag.name).join(', '))}" placeholder="adc, must-read"></label>
      <label class="field wide"><span>${escapeHtml(t('notes'))}</span><textarea id="paperNote" placeholder="Your private reading note">${escapeHtml(paper.note || '')}</textarea></label>
      <button class="button primary" id="savePaperState" type="button">${escapeHtml(t('saveReading'))}</button>
      <p class="hint" id="paperStateMsg"></p>
    </section>
  `;
  $('savePaperState').addEventListener('click', savePaperState);
  bindProfileLinks();
}

async function savePaperState() {
  if (!state.activeId) return;
  $('paperStateMsg').textContent = 'Saving...';
  const paper = await api(`/api/private/papers/${state.activeId}/state`, {
    method: 'PUT',
    body: JSON.stringify({
      favorite: $('paperFavorite').checked,
      readingStatus: $('paperStatus').value,
      note: $('paperNote').value,
      tags: $('paperTags').value.split(',').map(x => x.trim()).filter(Boolean)
    })
  });
  state.activePaper = paper;
  $('paperStateMsg').textContent = 'Saved.';
  await loadStats();
  await search();
}

async function importDoi() {
  const doi = $('doiInput').value.trim();
  if (!doi) return;
  $('importStatus').textContent = 'Importing metadata...';
  const paper = await api('/api/import/doi', { method: 'POST', body: JSON.stringify({ doi }) });
  $('importStatus').textContent = `Imported: ${cleanDisplayText(paper.title)}`;
  $('doiInput').value = '';
  await loadStats();
  await search();
  await loadPaper(paper.id);
}

async function importManual() {
  $('importStatus').textContent = 'Adding paper...';
  const paper = await api('/api/import/manual', {
    method: 'POST',
    body: JSON.stringify({
      title: $('manualTitle').value,
      authors: $('manualAuthors').value,
      venue: $('manualVenue').value,
      year: $('manualYear').value,
      abstract: $('manualAbstract').value
    })
  });
  $('importStatus').textContent = `Added: ${cleanDisplayText(paper.title)}`;
  ['manualTitle', 'manualAuthors', 'manualVenue', 'manualYear', 'manualAbstract'].forEach(id => $(id).value = '');
  await loadStats();
  await search();
  await loadPaper(paper.id);
}

async function saveApiKey() {
  const provider = $('apiProvider').value;
  const value = $('apiValue').value.trim();
  if (!value) return;
  const keys = await api(`/api/admin/api-keys/${encodeURIComponent(provider)}`, {
    method: 'PUT',
    body: JSON.stringify({ value })
  });
  $('apiValue').value = '';
  renderApiKeys(keys);
}

function debounce(fn, ms = 250) {
  let handle;
  return (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn(...args), ms);
  };
}

function searchFirstPage() {
  state.page = 1;
  return search();
}

async function bootApp() {
  showApp();
  applyLanguage();
  applyNavState();
  applyDetailState();
  await loadStats();
  renderTopicChips();
  const doSearch = debounce(searchFirstPage);
  for (const id of ['q', 'venue', 'field', 'rank', 'yearFrom', 'yearTo', 'sort', 'hasPdf', 'favoriteOnly', 'semantic', 'statusFilter', 'tagFilter']) {
    $(id).addEventListener(id === 'q' ? 'input' : 'change', doSearch);
  }
  $('importDoi').addEventListener('click', () => importDoi().catch(err => $('importStatus').textContent = err.message));
  $('importManual').addEventListener('click', () => importManual().catch(err => $('importStatus').textContent = err.message));
  $('saveApiKey').addEventListener('click', () => saveApiKey().catch(err => $('apiKeys').innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`));
  $('searchNow').addEventListener('click', () => searchFirstPage());
  $('resetFilters').addEventListener('click', () => {
    for (const id of ['venue', 'field', 'rank', 'statusFilter', 'tagFilter']) $(id).value = '';
    $('yearFrom').value = '2000';
    $('yearTo').value = String(new Date().getFullYear());
    $('hasPdf').checked = false;
    $('favoriteOnly').checked = false;
    searchFirstPage();
  });
  $('viewComfort').addEventListener('click', () => setView('comfort'));
  $('viewCompact').addEventListener('click', () => setView('compact'));
  $('navCollapse').addEventListener('click', () => {
    state.navCollapsed = !state.navCollapsed;
    applyNavState();
  });
  $('detailCollapse').addEventListener('click', () => {
    state.detailCollapsed = !state.detailCollapsed;
    applyDetailState();
  });
  $('languageToggle').addEventListener('click', async () => {
    state.language = state.language === 'zh' ? 'en' : 'zh';
    localStorage.setItem('icSeekerLanguage', state.language);
    applyLanguage();
    await loadStats();
    renderTopicChips();
    renderResults(state.resultMeta?.engine || '');
    renderPagination();
    if (state.activeId) await loadPaper(state.activeId);
    else renderEmptyDetail();
  });
  $('logout').hidden = !state.authEnabled;
  if (state.authEnabled) {
    $('logout').addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST', body: '{}' });
      showLogin('');
    });
  }
  document.querySelectorAll('[data-panel-jump]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-panel-jump]').forEach(tab => tab.classList.toggle('active', tab === button));
      const target = button.dataset.panelJump;
      if (target === 'authors' || target === 'institutions') {
        $('insightsPanel').open = true;
        const block = target === 'authors' ? $('professors') : $('institutions');
        block.scrollIntoView({ block: 'start', behavior: 'smooth' });
      } else if (target === 'sources') {
        $('sourceStatus').scrollIntoView({ block: 'start', behavior: 'smooth' });
      } else if (target === 'pdfs') {
        $('pdfInbox').scrollIntoView({ block: 'start', behavior: 'smooth' });
      } else {
        $('results').scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    });
  });
  await search();
}

function setView(view) {
  state.view = view;
  $('viewComfort').classList.toggle('active', view === 'comfort');
  $('viewCompact').classList.toggle('active', view === 'compact');
  renderResults(state.resultMeta?.engine || '');
}

async function main() {
  const auth = await api('/api/auth/status');
  state.authEnabled = Boolean(auth.authEnabled);
  $('loginTitle').textContent = auth.appName || 'IC Seeker Private';
  applyLanguage();
  if (!state.authEnabled || auth.authenticated) {
    await bootApp();
    return;
  }
  showLogin('');
  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    $('loginError').textContent = '';
    try {
      await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ password: $('password').value }) });
      await bootApp();
    } catch (err) {
      $('loginError').textContent = err.message;
    }
  });
}

main().catch(err => {
  if (state.authEnabled) showLogin(err.message);
  else {
    $('appShell').hidden = false;
    $('results').innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
  }
});
