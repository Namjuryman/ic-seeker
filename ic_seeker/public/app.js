import {
  countryFeatureCode,
  geoCountryAnchor,
  geoDenseRegionCodes,
  geoHotspots,
  geoLabelOffsets,
  prepareWorldMap
} from './js/geo-utils.js';

const state = {
  authenticated: false,
  authEnabled: false,
  language: localStorage.getItem('icSeekerLanguage') || 'zh',
  navCollapsed: localStorage.getItem('icSeekerNavCollapsed') === '1',
  filtersCollapsed: localStorage.getItem('icSeekerFiltersCollapsed') !== '0',
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
  geoCache: new Map(),
  geoWorldMap: null,
  geoWorldMapPromise: null,
  currentView: 'papers',
  restoringRoute: false,
  commandStripListenerBound: false,
  view: 'comfort',
  page: 1,
  limit: 30,
  total: 0,
  mentorInstitutionLimit: 80,
  mentorInstitutionQuery: '',
  mentorInstitutionRegion: '',
  mentorInstitutionMinPapers: 2,
  mentorInstitutionQsOnly: false,
  mentorRecentOnly: localStorage.getItem('icSeekerMentorRecentOnly') === '1',
  mentorInstitutionCache: new Map(),
  authorProfileCache: new Map(),
  institutionProfileCache: new Map()
};

const i18n = {
  en: {
    navSearch: 'Academic Search',
    navTopics: 'Topic Intelligence',
    navGeo: 'Geo Intelligence',
    navAuthors: 'Scholars',
    navInstitutions: 'Institutions',
    navMentors: 'Mentor Reviews',
    navSources: 'Data Sources',
    navPdfs: 'Local PDFs',
    navPrivate: 'IC Research Intelligence Platform',
    tagline: 'Research intelligence for the semiconductor era.',
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
    tabTopics: 'Topics',
    tabGeo: 'Geo',
    tabAuthors: 'Authors',
    tabInstitutions: 'Institutions',
    tabVenues: 'Venues',
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
    expandDetail: 'Expand detail',
    scholarType: 'Scholar type',
    risingFaculty: 'Rising / early-career faculty',
    establishedFaculty: 'Established active professor',
    seniorLeader: 'Senior field leader',
    careerStrength: 'Career academic strength',
    yearlyActivity: 'Yearly activity',
    rankDistribution: 'Venue rank distribution',
    recentPapers: 'Recent papers',
    collaboratorNetwork: 'Collaborators',
    institutionHistory: 'Institutions',
    authorRankings: 'Scholar rankings',
    institutionRankings: 'Institution rankings',
    openProfile: 'Open profile',
    careerInference: 'Career inference',
    estimatedAge: 'Age / stage',
    education: 'Education',
    firstJob: 'First job',
    careerSpan: 'Publication span',
    firstPublication: 'First indexed paper',
    affiliationPath: 'Affiliation path',
    educationCareerUnknown: 'Education and first job need CV/profile data.',
    inferredFromPapers: 'Inferred from local paper metadata; not a verified CV.',
    photoPending: 'Photo pending',
    profileSummary: 'Profile summary',
    profileSummaryText: 'Strongest in {field}, most visible at {venue}; {splus}% of indexed papers are S+, with peak activity in {peakYear}.',
    profilePaperFilters: 'Paper filters',
    filterAll: 'All',
    searchWithinProfile: 'Search within this profile...',
    doiAvailable: 'DOI',
    noDoi: 'no DOI',
    topicOverview: 'Topic overview',
    topicIntelligence: 'Topic intelligence',
    topicStrength: 'Topic strength',
    topicLeaders: 'Leading scholars',
    topicInstitutions: 'Leading institutions',
    topicVenues: 'Main venues',
    topicPapers: 'Representative papers',
    recentTopicPapers: 'Recent papers',
    topicTrend: 'Yearly trend',
    openTopic: 'Open topic',
    topicSummaryText: '{field} has {papers} indexed papers. Peak year: {peakYear}. S+ share: {splus}%.',
    setAsSearch: 'Search this topic',
    geoIntelligence: 'Regional intelligence',
    geoOverall: 'Academic strength',
    geoInstitutions: 'Institution view',
    geoTopic: 'Single-topic strength',
    geoTopicPick: 'Topic',
    geoTrend: 'Regional strength change',
    geoTopCountries: 'Top countries',
    geoTopInstitutions: 'Top institutions',
    geoHoverHint: 'Hover a country to inspect strength, institutions, and yearly trend.',
    geoPapers: 'Mapped papers',
    quickCitation: 'Quick citation',
    copyIeee: 'Copy IEEE',
    copyApa: 'Copy APA',
    copyBibtex: 'Copy BibTeX',
    copied: 'Copied.',
    sectionPapers: 'Papers',
    sectionMentors: 'Mentors',
    tabMentorInstitutions: 'By Institution',
    tabMentorRankings: 'QS Rankings',
    selectInstitution: 'Select an institution to view mentors',
    selectMentor: 'Select a mentor to view academic profile and reviews',
    institutionQsRank: 'QS World Rank',
    institutionRegionRank: 'QS Region Rank',
    institutionMentors: 'IC Mentors',
    institutionPapers: 'IC Papers',
    mentorPapers: 'Papers',
    mentorScore: 'Academic Score',
    mentorDomains: 'Research Domains',
    mentorSPlus: 'S+ Papers',
    mentorInstitutions: 'Affiliations',
    backToInstitutions: 'Back to institutions',
    backToMentors: 'Back to mentors',
    writeReview: 'Write Review',
    submitReview: 'Submit Review',
    reviewAlias: 'Your alias',
    reviewRelationship: 'Your role',
    reviewStrengths: 'Strengths / Highlights',
    reviewCautions: 'Cautions / Weaknesses',
    reviewFit: 'What kind of student fits?',
    mentorDisclaimer: 'Reviews are anonymous and moderated. Please be factual and avoid personal attacks.',
    insufficientData: 'Insufficient data',
    broadDistribution: 'Broad distribution only',
    venueMatrixTitle: 'Venue & Journal Matrix',
    venueMatrixSubtitle: 'Paper counts by year and domain for each conference/journal',
    venueMatrixTotal: 'Total Indexed',
    venueMatrixEarlier: 'Earlier',
    venueMatrixVenue: 'Venue',
    venueMatrixTier: 'Tier',
    venueMatrixDomain: 'Domain',
    venueMatrixClickToSearch: 'Click to search papers from this venue/year',
    venueMatrixYears: 'Year Distribution'
  },
  zh: {
    navSearch: '学术搜索',
    navTopics: '方向洞察',
    navAuthors: '学者画像',
    navInstitutions: '机构实力',
    navMentors: '导师评价',
    navSources: '数据来源',
    navPdfs: '本地 PDF',
    navPrivate: 'IC 科研情报平台',
    tagline: '半导体时代的科研情报平台',
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
    tabTopics: '方向',
    tabAuthors: '专家',
    tabInstitutions: '机构',
    tabVenues: '会议/期刊',
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
    expandDetail: '展开详情',
    scholarType: '学者判断',
    risingFaculty: '青年教师 / 新 AP',
    establishedFaculty: '活跃骨干教授',
    seniorLeader: '领域大牛',
    careerStrength: '职业生涯学术实力',
    yearlyActivity: '每年学术活跃度',
    rankDistribution: '分区/等级分布',
    recentPapers: '代表论文',
    collaboratorNetwork: '合作者网络',
    institutionHistory: '任职/合作机构',
    authorRankings: '老师排名',
    institutionRankings: '学校排名',
    openProfile: '打开画像',
    careerInference: '履历推断',
    estimatedAge: '年龄 / 阶段',
    education: '本硕博',
    firstJob: '第一份工作',
    careerSpan: '发文跨度',
    firstPublication: '首次收录发文',
    affiliationPath: '机构流动',
    educationCareerUnknown: '本硕博和第一份工作需要接入个人主页/CV 数据。',
    inferredFromPapers: '根据本地论文元数据推断，不等同于已核验简历。',
    photoPending: '照片待接入',
    profileSummary: '画像速读',
    profileSummaryText: '主要强项是 {field}，高频发表在 {venue}；收录论文中 {splus}% 为 S+，活跃峰值在 {peakYear}。',
    profilePaperFilters: '论文筛选',
    filterAll: '全部',
    searchWithinProfile: '在该画像内搜索论文...',
    doiAvailable: 'DOI',
    noDoi: '无 DOI',
    topicOverview: '方向总览',
    topicIntelligence: '方向洞察',
    topicStrength: '方向强度',
    topicLeaders: '强相关老师',
    topicInstitutions: '强相关机构',
    topicVenues: '主要会议/期刊',
    topicPapers: '代表论文',
    recentTopicPapers: '近期论文',
    topicTrend: '年度趋势',
    openTopic: '打开方向',
    topicSummaryText: '{field} 目前收录 {papers} 篇论文，峰值年份 {peakYear}，S+ 占比 {splus}%。',
    setAsSearch: '搜索该方向',
    copied: '已复制',
    navPrinciples: '产品原则',
    tabPrinciples: '原则',
    paperDiscussion: '论文讨论',
    mentorReviews: '导师评价',
    addComment: '发表评论',
    commentType: '评论类型',
    submitComment: '提交',
    noComments: '暂无评论。来做第一个讨论者吧。',
    reviewDisclaimer: '评分为基于元数据的研究发现指标，不代表对学术质量的最终判断。',
    mentorDisclaimer: '评价为匿名发布，经审核后展示。请基于事实、避免人身攻击。',
    insufficientData: '数据不足',
    broadDistribution: '仅展示分布概况',
    writeReview: '写评价',
    submitReview: '提交评价',
    reviewAlias: '你的昵称',
    reviewRelationship: '你的身份',
    reviewStrengths: '导师优点 / 闪光点',
    reviewCautions: '需要注意 / 不足',
    reviewFit: '适合什么样的学生？',
    venueMatrixTitle: '会议与期刊矩阵',
    venueMatrixSubtitle: '按年份和领域统计各会议/期刊的论文收录量',
    venueMatrixTotal: '收录总量',
    venueMatrixEarlier: '更早',
    venueMatrixVenue: '会议/期刊',
    venueMatrixTier: '等级',
    venueMatrixDomain: '领域',
    venueMatrixClickToSearch: '点击搜索该会议/年份的论文',
    venueMatrixYears: '年份分布',
    principlesTitle: 'SiliconScope 产品原则',
    principle1: '构建情报，而非仅搜索。',
    principle2: '销售结构化洞察，而非八卦。',
    principle3: '评论论文内容，不攻击作者个人。',
    principle4: '保护处于权力不平衡中的评价者。',
    principle5: '信任需要时验证用户。',
    principle6: '避免黑名单和人身攻击。',
    principle7: '数据不完整时展示不确定性。',
    principle8: '保留来源出处。',
    principle9: '不重新分发受版权保护的 PDF。',
    principle10: '让排名可解释且有限度。',
    principleKey: '论文讨论需要公开责任。导师评价需要验证匿名。',
    subtopics: '子方向',
    relatedPapers: '相关论文',
    noRelated: '未找到相关论文。',
    sectionPapers: '论文',
    sectionMentors: '导师/机构',
    tabMentorInstitutions: '按机构',
    tabMentorRankings: 'QS 排名',
    selectInstitution: '选择一个学校/机构查看导师列表',
    selectMentor: '选择一个导师查看学术实力和评价',
    institutionQsRank: 'QS 世界排名',
    institutionRegionRank: 'QS 地区排名',
    institutionMentors: 'IC 导师数',
    institutionPapers: 'IC 论文数',
    mentorPapers: '论文',
    mentorScore: '学术评分',
    mentorDomains: '研究方向',
    mentorSPlus: 'S+ 论文',
    mentorInstitutions: '所属机构',
    backToInstitutions: '返回机构列表',
    backToMentors: '返回导师列表',
    writeReview: '写评价',
    submitReview: '提交评价',
    reviewAlias: '你的昵称',
    reviewRelationship: '你的身份',
    reviewStrengths: '导师优点 / 闪光点',
    reviewCautions: '需要注意 / 不足',
    reviewFit: '适合什么样的学生？',
    mentorDisclaimer: '评价为匿名发布，经审核后展示。请基于事实、避免人身攻击。',
    insufficientData: '数据不足',
    broadDistribution: '仅展示分布概况'
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

const topicHierarchy = {
  'Power Management': ['LDO', 'DC-DC', 'buck converter', 'boost converter', 'switched-capacitor converter', 'charge pump'],
  'Data Converters': ['SAR ADC', 'pipeline ADC', 'sigma-delta ADC', 'DAC'],
  'Clocking': ['PLL', 'DLL', 'CDR', 'oscillator'],
  'RF/Wireless': ['LNA', 'Mixer', 'PA', 'Transceiver', 'mmWave'],
  'Memory/Compute': ['SRAM', 'DRAM', 'Compute-in-Memory', 'Accelerator'],
  'Wireline': ['SerDes', 'CDR', 'Equalizer', 'NRZ/PAM4'],
  'EDA/Digital': ['FPGA', 'Placement', 'Routing', 'Verification'],
  'Biomedical/Sensor': ['Biosensor', 'Neural Interface', 'Imaging'],
  'Security/Reliability': ['PUF', 'Side-channel', ' Aging'],
  'General IC': []
};

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

function rankToClass(rank) {
  const r = String(rank || '').trim();
  if (!r || r === '-') return 'Unknown';
  return r.replace('+', 'plus').replace('-', 'minus');
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

function applyFilterState() {
  document.body.classList.toggle('filters-collapsed', state.filtersCollapsed);
  const button = $('filterCollapse');
  if (button) {
    button.classList.toggle('active', !state.filtersCollapsed);
    button.setAttribute('aria-pressed', String(!state.filtersCollapsed));
  }
  localStorage.setItem('icSeekerFiltersCollapsed', state.filtersCollapsed ? '1' : '0');
}

function currentSearchRoute() {
  return {
    view: 'papers',
    q: $('q')?.value || '',
    scope: $('searchScope')?.value || 'all',
    venue: $('venue')?.value || '',
    field: $('field')?.value || '',
    rank: $('rank')?.value || '',
    yearFrom: $('yearFrom')?.value || '',
    yearTo: $('yearTo')?.value || '',
    sort: $('sort')?.value || 'relevance',
    semantic: $('semantic')?.checked ? '1' : '0',
    hasPdf: $('hasPdf')?.checked ? '1' : '',
    favoriteOnly: $('favoriteOnly')?.checked ? '1' : '',
    status: $('statusFilter')?.value || '',
    tag: $('tagFilter')?.value || '',
    page: String(state.page || 1)
  };
}

function routeUrl(route) {
  const url = new URL(window.location.href);
  url.search = '';
  const params = url.searchParams;
  const view = route.view || 'papers';
  params.set('view', view);
  const allowedKeys = {
    author: new Set(['name']),
    institution: new Set(['name']),
    rankings: new Set(['kind']),
    topics: new Set(['field']),
    geo: new Set(['field', 'mode', 'country']),
    paper: new Set(['q', 'scope', 'venue', 'field', 'rank', 'yearFrom', 'yearTo', 'sort', 'semantic', 'hasPdf', 'favoriteOnly', 'status', 'tag', 'page', 'id']),
    papers: new Set(['q', 'scope', 'venue', 'field', 'rank', 'yearFrom', 'yearTo', 'sort', 'semantic', 'hasPdf', 'favoriteOnly', 'status', 'tag', 'page']),
    venueMatrix: new Set([]),
    'mentor-institutions': new Set([]),
    'mentor-institution': new Set(['name']),
    'mentor-profile': new Set(['name'])
  };
  const allowed = allowedKeys[view] || allowedKeys.papers;
  for (const [key, value] of Object.entries(route)) {
    if (key === 'view' || !allowed.has(key) || value === undefined || value === null || value === '' || value === '0') continue;
    params.set(key, String(value));
  }
  if (view === 'papers') params.delete('view');
  return `${url.pathname}${url.search}${url.hash}`;
}

function writeRoute(route, mode = 'push') {
  if (state.restoringRoute) return;
  const nextRoute = { ...route };
  const method = mode === 'replace' ? 'replaceState' : 'pushState';
  history[method](nextRoute, '', routeUrl(nextRoute));
  state.currentRoute = nextRoute;
}

function routeFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const route = {
    view: params.get('view') || 'papers',
    q: params.get('q') || '',
    scope: params.get('scope') || 'all',
    venue: params.get('venue') || '',
    field: params.get('field') || '',
    rank: params.get('rank') || '',
    yearFrom: params.get('yearFrom') || '',
    yearTo: params.get('yearTo') || '',
    sort: params.get('sort') || 'relevance',
    semantic: params.get('semantic') === '0' ? '0' : '1',
    hasPdf: params.get('hasPdf') || '',
    favoriteOnly: params.get('favoriteOnly') || '',
    status: params.get('status') || '',
    tag: params.get('tag') || '',
    page: params.get('page') || '1',
    id: params.get('id') || '',
    name: params.get('name') || '',
    kind: params.get('kind') || '',
    field: params.get('field') || '',
    mode: params.get('mode') || '',
    country: params.get('country') || ''
  };
  return route;
}

function applySearchRoute(route) {
  $('q').value = route.q || '';
  $('searchScope').value = route.scope || 'all';
  $('venue').value = route.venue || '';
  $('field').value = route.field || '';
  $('rank').value = route.rank || '';
  $('yearFrom').value = route.yearFrom || '2000';
  $('yearTo').value = route.yearTo || String(new Date().getFullYear());
  $('sort').value = route.sort || 'relevance';
  $('semantic').checked = route.semantic !== '0';
  $('hasPdf').checked = route.hasPdf === '1';
  $('favoriteOnly').checked = route.favoriteOnly === '1';
  $('statusFilter').value = route.status || '';
  $('tagFilter').value = route.tag || '';
  state.page = Math.max(1, Number(route.page || 1));
}

function setActivePanel(target) {
  document.querySelectorAll('[data-panel-jump]').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.panelJump === target);
  });
}

function openPanelTarget(target) {
  setActivePanel(target);
  if (target === 'topics') {
    renderTopics();
  } else if (target === 'geo') {
    renderGeo();
  } else if (target === 'authors') {
    renderRankings('authors');
  } else if (target === 'institutions') {
    renderRankings('institutions');
  } else if (target === 'venueMatrix') {
    renderVenueMatrix();
  } else if (target === 'mentor-institutions') {
    switchSection('mentors');
  } else if (target === 'mentor-rankings') {
    switchSection('mentors');
  } else if (target === 'sources') {
    $('sourceStatus').scrollIntoView({ block: 'start', behavior: 'smooth' });
  } else if (target === 'pdfs') {
    $('pdfInbox').scrollIntoView({ block: 'start', behavior: 'smooth' });
  } else {
    switchSection('papers');
    searchFirstPage();
    $('results').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}

async function restoreRoute(route = history.state || routeFromLocation()) {
  state.restoringRoute = true;
  try {
    const view = route?.view || 'papers';
    if (view === 'author' && route.name) {
      setActivePanel('authors');
      await loadAuthor(route.name, { history: 'skip' });
    } else if (view === 'institution' && route.name) {
      setActivePanel('institutions');
      await loadInstitution(route.name, { history: 'skip' });
    } else if (view === 'rankings') {
      setActivePanel(route.kind === 'institutions' ? 'institutions' : 'authors');
      renderRankings(route.kind === 'institutions' ? 'institutions' : 'authors', { history: 'skip' });
    } else if (view === 'topics') {
      setActivePanel('topics');
      await renderTopics(route.field || '', { history: 'skip' });
    } else if (view === 'geo') {
      setActivePanel('geo');
      await renderGeo(route.field || '', { history: 'skip', mode: route.mode || '', country: route.country || '' });
    } else if (view === 'venueMatrix') {
      setActivePanel('venueMatrix');
      renderVenueMatrix({ history: 'skip' });
    } else if (view === 'mentor-institutions') {
      await switchSection('mentors', { history: 'skip' });
    } else if (view === 'mentor-institution' && route.name) {
      await switchSection('mentors', { renderDefault: false });
      await renderMentorByInstitution(route.name, { history: 'skip' });
    } else if (view === 'mentor-profile' && route.name) {
      await switchSection('mentors', { renderDefault: false });
      await loadMentorProfile(route.name, { history: 'skip' });
    } else {
      setActivePanel('papers');
      applySearchRoute(route || {});
      if (view !== 'paper') {
        state.activeId = null;
        state.activePaper = null;
      }
      await search({ history: 'skip' });
      if (view === 'paper' && route.id) await loadPaper(Number(route.id), { history: 'skip' });
    }
    state.currentRoute = { ...route, view };
  } finally {
    state.restoringRoute = false;
  }
}

function renderEmptyDetail() {
  state.activeId = null;
  state.activePaper = null;
  state.detailCollapsed = true;
  document.body.classList.remove('paper-detail-active');
  document.documentElement.style.removeProperty('--detail-rail-top');
  const isZh = state.language === 'zh';
  $('detail').innerHTML = `
    <div class="empty detail-empty">
      <strong>${isZh ? '选择一篇论文开始阅读管理' : 'Select a paper to start reading'}</strong>
      <p>${escapeHtml(t('selectPaper'))}</p>
      <div class="empty-actions">
        <button type="button" data-empty-action="search">${isZh ? '回到论文搜索' : 'Paper search'}</button>
        <button type="button" data-empty-action="geo">${isZh ? '区域地图' : 'Geo map'}</button>
        <button type="button" data-empty-action="authors">${isZh ? '作者排行' : 'Scholar ranking'}</button>
      </div>
    </div>`;
  $('detail').querySelectorAll('[data-empty-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.emptyAction;
      openPanelTarget(action === 'search' ? 'papers' : action);
    });
  });
  const discussionBox = $('discussionBox');
  if (discussionBox) discussionBox.innerHTML = '<p class="hint">Select a paper to view discussion.</p>';
  const reviewBox = $('reviewBox');
  if (reviewBox) reviewBox.innerHTML = '<p class="hint">Select a scholar to view reviews.</p>';
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
  $('appTitle').textContent = stats.appName || 'SiliconScope';
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
  renderCommandStrip();
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

function renderCommandStrip() {
  if (!$('commandStrip') || !state.stats) return;
  const isZh = state.language === 'zh';
  const total = Number(state.stats.total || 0);
  const pdfs = Number(state.stats.pdfs || 0);
  const pdfRate = total ? Math.round(pdfs / total * 100) : 0;
  const minYear = state.stats.years?.minYear || '-';
  const maxYear = state.stats.years?.maxYear || '-';
  const ieeeReady = hasProvider(state.apiKeys || [], ['ieee']);
  const aminerReady = hasProvider(state.apiKeys || [], ['aminer']);
  const verified = state.stats.byVerification?.find(row => String(row.status || '').toLowerCase().includes('verified'));
  const verifiedCount = Number(verified?.count || 0);
  const verifiedRate = total ? Math.round(verifiedCount / total * 100) : 0;
  const cards = [
    {
      label: isZh ? '数据库' : 'Database',
      value: fmt(total),
      meta: `${minYear}-${maxYear}`,
      tone: 'blue'
    },
    {
      label: isZh ? 'PDF 私库' : 'PDF library',
      value: `${pdfRate}%`,
      meta: `${fmt(pdfs)} ${isZh ? '已匹配' : 'matched'}`,
      tone: pdfRate ? 'green' : 'muted'
    },
    {
      label: isZh ? 'IEEE 精修' : 'IEEE refine',
      value: ieeeReady ? (isZh ? '已就绪' : 'Ready') : (isZh ? '待接入' : 'Pending'),
      meta: aminerReady ? 'AMiner ready' : 'OpenAlex / Crossref base',
      tone: ieeeReady ? 'green' : 'amber'
    },
    {
      label: isZh ? '数据可信度' : 'Data quality',
      value: `${verifiedRate}%`,
      meta: isZh ? '机构/作者消歧待加强' : 'Disambiguation pending',
      tone: verifiedRate > 35 ? 'green' : 'amber'
    }
  ];
  $('commandStrip').innerHTML = `
    <div class="status-cards">
      ${cards.map(card => `<div class="status-card ${card.tone}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <em>${escapeHtml(card.meta)}</em>
      </div>`).join('')}
    </div>
    <div class="status-actions">
      <button class="micro-action" type="button" data-panel-jump="geo">${isZh ? '区域地图' : 'Geo map'}</button>
      <button class="micro-action" type="button" data-panel-jump="sources">${isZh ? '数据源' : 'Sources'}</button>
      <button class="micro-action" type="button" data-panel-jump="pdfs">${isZh ? 'PDF 接入' : 'PDFs'}</button>
    </div>
  `;
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

function cleanProfileAuthorName(value) {
  let name = String(value || '').trim().replace(/\s+/g, ' ');
  if (!name) return '';
  if (name.endsWith(')') && !name.includes('(')) return '';
  name = name.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  if (!name) return '';
  if (/\b(university|institute|academy|laborator(?:y|ies)|labs?|center|centre|school|college|department|faculty|hospital|corporation|company|technologies|technology|ltd|inc|research center|engineering research|state key|national engineering)\b/i.test(name)) return '';
  if (name.length > 80) return '';
  return name;
}

function splitProfileList(value, type = 'generic') {
  const raw = String(value || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean);
  if (type !== 'author') return raw;
  const seen = new Set();
  return raw
    .map(cleanProfileAuthorName)
    .filter(item => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function tokenLinks(value, type) {
  const attr = type === 'author' ? 'data-author-link' : 'data-institution-link';
  return splitProfileList(value, type)
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

function scholarType(profile, paperCount) {
  const years = (profile.byYear || []).map(row => Number(row.key)).filter(Boolean);
  const firstYear = years.length ? Math.min(...years) : new Date().getFullYear();
  const careerYears = Math.max(1, new Date().getFullYear() - firstYear + 1);
  const sPlus = Number(profile.ranks?.sPlus || 0);
  if (sPlus >= 40 || Number(profile.authorScore || 0) > 8000) return t('seniorLeader');
  if (careerYears <= 8 || paperCount < 35) return t('risingFaculty');
  return t('establishedFaculty');
}

function initials(name) {
  return String(name || 'IC')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'IC';
}

function renderPhotoPlaceholder() {
  return `<div class="profile-photo empty-photo"><span>${escapeHtml(t('photoPending'))}</span></div>`;
}

function yearlySeriesFromPapers(papers, field) {
  const byYear = new Map();
  for (const paper of papers || []) {
    const year = Number(paper.year || 0);
    if (!year) continue;
    const value = field === 'score' ? Number(paper.score || 0) : 1;
    byYear.set(year, (byYear.get(year) || 0) + value);
  }
  return [...byYear.entries()]
    .map(([key, count]) => ({ key, count: Math.round(count * 10) / 10 }))
    .sort((a, b) => Number(a.key) - Number(b.key));
}

function renderSparkBars(rows, label, mode = 'bar') {
  const max = Math.max(1, ...rows.map(row => Number(row.count || 0)));
  const chartRows = rows.length ? rows : [{ key: '-', count: 0 }];
  const width = 320;
  const height = 150;
  const padX = 20;
  const top = 18;
  const bottom = 28;
  const chartHeight = height - top - bottom;
  const step = chartRows.length > 1 ? (width - padX * 2) / (chartRows.length - 1) : 0;
  const points = chartRows.map((row, index) => {
    const x = chartRows.length > 1 ? padX + index * step : width / 2;
    const value = Number(row.count || 0);
    const y = top + chartHeight - (value / max) * chartHeight;
    return { x, y, value, key: row.key };
  });
  const polyline = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const barWidth = Math.max(8, Math.min(18, (width - padX * 2) / Math.max(1, chartRows.length) * 0.55));
  return `<div class="spark-panel">
    <h3>${escapeHtml(label)}</h3>
    <div class="spark-chart">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}">
        <line x1="${padX}" y1="${top + chartHeight}" x2="${width - padX}" y2="${top + chartHeight}" class="chart-axis"></line>
        ${mode === 'line'
          ? `<polyline class="chart-line" points="${polyline}"></polyline>
             ${points.map(point => `<circle class="chart-dot" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3.5"><title>${escapeHtml(point.key)}: ${escapeHtml(point.value)}</title></circle>`).join('')}`
          : points.map(point => {
              const barHeight = Math.max(6, top + chartHeight - point.y);
              return `<rect class="chart-bar" x="${(point.x - barWidth / 2).toFixed(1)}" y="${(top + chartHeight - barHeight).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="4"><title>${escapeHtml(point.key)}: ${escapeHtml(point.value)}</title></rect>`;
            }).join('')}
        ${points.map((point, index) => {
          if (chartRows.length > 8 && index % 2 === 1) return '';
          return `<text x="${point.x.toFixed(1)}" y="${height - 8}" text-anchor="middle">${escapeHtml(String(point.key).slice(-2))}</text>`;
        }).join('')}
      </svg>
    </div>
  </div>`;
}

function renderClickableMiniBars(rows, label = 'count', type = 'author') {
  const max = Math.max(1, ...rows.map(row => Number(row.count || 0)));
  const attr = type === 'author' ? 'data-author-link' : 'data-institution-link';
  return `<div class="mini-bars">
    ${rows.map(row => `
      <div class="mini-row">
        <button class="text-link mini-link" ${attr}="${escapeHtml(row.key)}">${escapeHtml(row.key)}</button>
        <div><i style="width:${Math.max(4, Number(row.count || 0) / max * 100)}%"></i></div>
        <strong>${escapeHtml(row.count)} ${escapeHtml(label)}</strong>
      </div>
    `).join('')}
  </div>`;
}

function careerStageText(profile, paperCount) {
  const years = (profile.byYear || []).map(row => Number(row.key)).filter(Boolean);
  const firstYear = years.length ? Math.min(...years) : null;
  const lastYear = years.length ? Math.max(...years) : null;
  const careerYears = firstYear && lastYear ? lastYear - firstYear + 1 : 0;
  const type = scholarType(profile, paperCount);
  return { firstYear, lastYear, careerYears, type };
}

function affiliationTimeline(papers) {
  const byYear = new Map();
  for (const paper of papers || []) {
    const year = Number(paper.year || 0);
    if (!year) continue;
    if (!byYear.has(year)) byYear.set(year, new Map());
    const counts = byYear.get(year);
    for (const institution of splitProfileList(paper.affiliations)) {
      counts.set(institution, (counts.get(institution) || 0) + 1);
    }
  }
  const yearly = [...byYear.entries()]
    .map(([year, counts]) => {
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      return top ? { year, institution: top[0], count: top[1] } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.year - b.year);
  const compressed = [];
  for (const item of yearly) {
    const last = compressed.at(-1);
    if (last && last.institution === item.institution) {
      last.end = item.year;
      last.count += item.count;
    } else {
      compressed.push({ start: item.year, end: item.year, institution: item.institution, count: item.count });
    }
  }
  return compressed.slice(-8);
}

function renderCareerInference(profile, paperCount) {
  const stage = careerStageText(profile, paperCount);
  const span = stage.firstYear ? `${stage.firstYear}-${stage.lastYear} (${stage.careerYears}y indexed)` : '-';
  const timeline = affiliationTimeline(profile.papers);
  return `<section class="career-inference">
    <h3>${escapeHtml(t('careerInference'))}</h3>
    <p class="hint">${escapeHtml(t('inferredFromPapers'))}</p>
    <div class="career-grid">
      <div><span>${escapeHtml(t('estimatedAge'))}</span><strong>${escapeHtml(stage.type)}</strong><em>${escapeHtml(t('educationCareerUnknown'))}</em></div>
      <div><span>${escapeHtml(t('careerSpan'))}</span><strong>${escapeHtml(span)}</strong><em>${escapeHtml(t('firstPublication'))}: ${escapeHtml(stage.firstYear || '-')}</em></div>
    </div>
    <h4>${escapeHtml(t('affiliationPath'))}</h4>
    <div class="career-path">
      ${timeline.length ? timeline.map(item => `<button class="career-step" type="button" data-institution-link="${escapeHtml(item.institution)}">
        <span>${escapeHtml(item.start === item.end ? item.start : `${item.start}-${item.end}`)}</span>
        <strong>${escapeHtml(item.institution)}</strong>
      </button>`).join('<i></i>') : `<span class="hint">${escapeHtml(t('educationCareerUnknown'))}</span>`}
    </div>
  </section>`;
}

function renderRankDonut(ranks) {
  const items = [
    ['S+', Number(ranks?.sPlus || 0)],
    ['S', Number(ranks?.s || 0)],
    ['A', Number(ranks?.a || 0)],
    ['Other', Number(ranks?.other || 0)]
  ];
  const max = Math.max(1, ...items.map(([, count]) => count));
  return `<div class="rank-stack">
    ${items.map(([label, count]) => `<div class="rank-line">
      <span>${escapeHtml(label)}</span>
      <div><i style="width:${Math.max(3, count / max * 100)}%"></i></div>
      <strong>${fmt(count)}</strong>
    </div>`).join('')}
  </div>`;
}

function topCount(rows, fallback = '-') {
  return rows?.[0]?.key || fallback;
}

function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items || []) {
    const key = keyFn(item) || '-';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)));
}

function renderProfileSummary(profile, paperCount) {
  const topField = topCount(profile.byDomain);
  const topVenue = topCount(profile.byVenue);
  const peak = [...(profile.byYear || [])].sort((a, b) => Number(b.count) - Number(a.count))[0];
  const sPlusShare = Math.round(Number(profile.ranks?.sPlus || 0) / Math.max(1, paperCount) * 100);
  const text = t('profileSummaryText')
    .replace('{field}', topField)
    .replace('{venue}', topVenue)
    .replace('{splus}', String(sPlusShare))
    .replace('{peakYear}', String(peak?.key || '-'));
  return `<section class="profile-summary">
    <h3>${escapeHtml(t('profileSummary'))}</h3>
    <p>${escapeHtml(text)}</p>
    <div class="profile-summary-facts">
      <span>${escapeHtml(t('scholarType'))}: ${escapeHtml(scholarType(profile, paperCount))}</span>
      <span>${escapeHtml(t('summaryTopField'))}: ${escapeHtml(topField)}</span>
      <span>${escapeHtml(t('summaryTopVenue'))}: ${escapeHtml(topVenue)}</span>
      <span>S+ ${sPlusShare}%</span>
    </div>
  </section>`;
}

function profilePapers(papers, title = t('recentPapers')) {
  const visiblePapers = papers.slice(0, 120);
  const fields = countBy(visiblePapers, row => row.field).slice(0, 6);
  const ranks = countBy(visiblePapers, row => row.rank).slice(0, 6);
  return `<section class="profile-paper-section">
    <div class="profile-paper-head">
      <h3>${escapeHtml(title)}</h3>
      <input id="profilePaperSearch" type="search" placeholder="${escapeHtml(t('searchWithinProfile'))}">
    </div>
    <div class="profile-filter-group" aria-label="${escapeHtml(t('profilePaperFilters'))}">
      <button class="profile-filter active" type="button" data-profile-filter="all" data-profile-value="">${escapeHtml(t('filterAll'))}</button>
      ${fields.map(row => `<button class="profile-filter" type="button" data-profile-filter="field" data-profile-value="${escapeHtml(row.key)}">${escapeHtml(row.key)} <span>${fmt(row.count)}</span></button>`).join('')}
      ${ranks.map(row => `<button class="profile-filter" type="button" data-profile-filter="rank" data-profile-value="${escapeHtml(row.key)}">${escapeHtml(row.key)} <span>${fmt(row.count)}</span></button>`).join('')}
    </div>
    <div class="profile-papers">
    ${visiblePapers.map(row => `
      <div class="profile-paper" data-id="${row.id}" data-field="${escapeHtml(row.field)}" data-rank="${escapeHtml(row.rank)}" data-title="${escapeHtml(cleanDisplayText(row.title).toLowerCase())}">
        <p>${escapeHtml(cleanDisplayText(row.title))}</p>
        <div class="meta">
          <span class="pill rank">${escapeHtml(row.rank)}</span>
          <span class="pill">${escapeHtml(row.venue)}</span>
          <span class="pill">${escapeHtml(row.field)}</span>
          <span class="pill">${escapeHtml(row.year)}</span>
          <span class="pill">score ${escapeHtml(row.score)}</span>
          <span class="pill">${escapeHtml(fmt(row.citations || 0))} citations</span>
          <span class="pill">${escapeHtml(row.doi ? t('doiAvailable') : t('noDoi'))}</span>
        </div>
      </div>
    `).join('')}
    </div>
  </section>`;
}

function bindProfileLinks() {
  document.querySelectorAll('[data-author-link]').forEach(el => el.addEventListener('click', () => loadAuthor(el.dataset.authorLink)));
  document.querySelectorAll('[data-institution-link]').forEach(el => el.addEventListener('click', () => loadInstitution(el.dataset.institutionLink)));
  document.querySelectorAll('.profile-paper').forEach(el => el.addEventListener('click', event => loadPaper(Number(el.dataset.id), { anchorY: event.clientY })));
  let activeFilter = { type: 'all', value: '' };
  const applyProfilePaperFilters = () => {
    const query = ($('profilePaperSearch')?.value || '').trim().toLowerCase();
    document.querySelectorAll('.profile-paper').forEach(card => {
      const filterMatch = activeFilter.type === 'all' || card.dataset[activeFilter.type] === activeFilter.value;
      const textMatch = !query || card.dataset.title.includes(query);
      card.hidden = !(filterMatch && textMatch);
    });
  };
  document.querySelectorAll('[data-profile-filter]').forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = { type: button.dataset.profileFilter, value: button.dataset.profileValue || '' };
      document.querySelectorAll('[data-profile-filter]').forEach(item => item.classList.toggle('active', item === button));
      applyProfilePaperFilters();
    });
  });
  $('profilePaperSearch')?.addEventListener('input', applyProfilePaperFilters);
}

async function loadAuthor(name, options = {}) {
  if (options.history !== 'skip') writeRoute({ view: 'author', name });
  state.currentView = 'author';
  document.body.classList.remove('mentor-section');
  state.detailCollapsed = false;
  applyDetailState();
  scrollPageTop(options);
  renderProfileLoading(`Loading scholar profile: ${name}...`, 'Preparing scholar detail...');
  const profileKey = name.toLowerCase();
  const profile = state.authorProfileCache.get(profileKey)
    || await api(`/api/authors/${encodeURIComponent(name)}`);
  state.authorProfileCache.set(profileKey, profile);
  const paperCount = profile.paperCount ?? (Array.isArray(profile.papers) ? profile.papers.length : profile.papers);
  const activity = yearlySeriesFromPapers(profile.papers, 'count');
  const strength = yearlySeriesFromPapers(profile.papers, 'score');
  $('results').innerHTML = `
    <section class="author-paper-page">
      <div class="profile-results-head">
        <div>
          <p class="profile-kicker">${escapeHtml(t('navAuthors'))}</p>
          <h2>${escapeHtml(profile.name)}</h2>
          <p>${fmt(paperCount)} ${escapeHtml(t('summaryPapers'))} / ${escapeHtml(t('summaryTopField'))}: ${escapeHtml(profile.byDomain?.[0]?.key || '-')}</p>
        </div>
        <div class="profile-tags">
          <span>${escapeHtml(t('scholarType'))}: ${escapeHtml(scholarType(profile, paperCount))}</span>
          <span>S+ ${fmt(profile.ranks.sPlus)} / S ${fmt(profile.ranks.s)} / A ${fmt(profile.ranks.a)}</span>
        </div>
      </div>
      <section class="profile-grid wide-profile-grid">
        <div class="metric"><span>${escapeHtml(t('summaryPapers'))}</span><strong>${fmt(paperCount)}</strong></div>
        <div class="metric"><span>${escapeHtml(t('summaryTopVenue'))}</span><strong>${escapeHtml(profile.byVenue?.[0]?.key || '-')}</strong></div>
        <div class="metric"><span>S+ / S / A</span><strong>${fmt(profile.ranks.sPlus)} / ${fmt(profile.ranks.s)} / ${fmt(profile.ranks.a)}</strong></div>
        <div class="metric"><span>${escapeHtml(t('summaryTopField'))}</span><strong>${escapeHtml(profile.byDomain?.[0]?.key || '-')}</strong></div>
      </section>
      ${profilePapers(profile.papers)}
    </section>
  `;
  $('detail').innerHTML = `
    <section class="author-profile-detail">
      <div class="profile-hero compact-profile-hero">
        ${renderPhotoPlaceholder()}
        <div class="profile-main">
          <p class="profile-kicker">${escapeHtml(t('profileSummary'))}</p>
          <h2>${escapeHtml(profile.name)}</h2>
          <div class="profile-tags">
            <span>${fmt(paperCount)} ${escapeHtml(t('summaryPapers'))}</span>
            <span>${escapeHtml(t('sortScore'))} ${escapeHtml(profile.authorScore)}</span>
            ${profile.qs ? `<span class="qs-badge">${escapeHtml(profile.qs?.name || profile.primaryInstitution)} QS ${profile.qs?.qs_world_rank || 'N/A'}</span>` : ''}
          </div>
          <div class="actions">
            <a class="primary" target="_blank" href="${escapeHtml(profile.external.googleScholar)}">Scholar</a>
            <a target="_blank" href="${escapeHtml(profile.external.webSearch)}">Web search</a>
            <button class="button primary" id="writeReviewBtn" type="button">${escapeHtml(t('writeReview'))}</button>
          </div>
        </div>
      </div>
      ${renderProfileSummary(profile, paperCount)}
      ${renderSparkBars(strength, t('careerStrength'), 'line')}
      ${renderSparkBars(activity, t('yearlyActivity'), 'bar')}
      <section class="profile-side-panel">
        <h3>${escapeHtml(t('rankDistribution'))}</h3>
        ${renderRankDonut(profile.ranks)}
      </section>
      ${renderCareerInference(profile, paperCount)}
      <section class="profile-side-panel">
        <h3>${escapeHtml(t('collaboratorNetwork'))}</h3>
        ${renderClickableMiniBars(profile.coauthors.slice(0, 16), 'papers', 'author')}
      </section>
      <section class="profile-side-panel">
        <h3>${escapeHtml(t('institutionHistory'))}</h3>
        <div class="link-cloud">${tokenLinks(profile.institutions.map(x => x.key).join('; '), 'institution')}</div>
      </section>
    </section>
  `;
  bindProfileLinks();
  renderMentorReviews(name);
  $('writeReviewBtn')?.addEventListener('click', () => {
    const reviewPanel = $('reviewPanel');
    if (reviewPanel) {
      reviewPanel.open = true;
      reviewPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

async function loadInstitution(name, options = {}) {
  if (options.history !== 'skip') writeRoute({ view: 'institution', name });
  state.currentView = 'institution';
  document.body.classList.remove('mentor-section');
  state.detailCollapsed = true;
  applyDetailState();
  scrollPageTop(options);
  renderProfileLoading(`Loading institution profile: ${name}...`, 'Institution detail will appear after loading.');
  const profileKey = name.toLowerCase();
  const profile = state.institutionProfileCache.get(profileKey)
    || await api(`/api/institutions/${encodeURIComponent(name)}`);
  state.institutionProfileCache.set(profileKey, profile);
  const paperCount = profile.paperCount ?? (Array.isArray(profile.papers) ? profile.papers.length : profile.papers);
  const activity = yearlySeriesFromPapers(profile.papers, 'count');
  const strength = yearlySeriesFromPapers(profile.papers, 'score');
  const ambiguousNote = state.lang === 'zh'
    ? '这个名称更像二级院系/研究中心，不是唯一学校实体。当前先隐藏导师画像，下面列出可能的上级机构；后续接入 IEEE 作者-单位映射后再精确合并。'
    : 'This looks like a subunit rather than a unique institution entity. Scholar portraits are hidden for now; possible parent institutions are listed below until author-affiliation mapping is connected.';
  $('results').innerHTML = `
    <section class="scholar-profile">
      <div class="profile-hero institution-hero">
        <div class="profile-photo institution-photo">${escapeHtml(initials(profile.name))}</div>
        <div class="profile-main">
          <p class="profile-kicker">${escapeHtml(t('navInstitutions'))}</p>
          <h2>${escapeHtml(profile.name)}</h2>
          <div class="profile-tags">
            <span>${fmt(paperCount)} ${escapeHtml(t('summaryPapers'))}</span>
            <span>S+ ${fmt(profile.ranks.sPlus)} / S ${fmt(profile.ranks.s)} / A ${fmt(profile.ranks.a)}</span>
            ${profile.qs ? `<span class="qs-badge">QS World ${profile.qs.qs_world_rank}</span>` : ''}
          </div>
        </div>
        <div class="profile-score">
          <span>${escapeHtml(t('sortScore'))}</span>
          <strong>${escapeHtml(profile.institutionScore)}</strong>
          <em>${escapeHtml(t('summaryTopField'))}: ${escapeHtml(profile.byDomain?.[0]?.key || '-')}</em>
          ${profile.qs ? `<em style="margin-top:4px">${escapeHtml(profile.qs.region)} Rank: ${profile.qs.qs_region_rank}</em>` : ''}
        </div>
      </div>
      <section class="profile-analytics">
        ${renderSparkBars(strength, t('careerStrength'), 'line')}
        ${renderSparkBars(activity, t('yearlyActivity'), 'bar')}
        <div class="spark-panel"><h3>${escapeHtml(t('rankDistribution'))}</h3>${renderRankDonut(profile.ranks)}</div>
      </section>
      ${profile.ambiguousSubunit ? `<section class="profile-side-panel ambiguous-node">
        <h3>${state.lang === 'zh' ? '需要归并的二级机构' : 'Subunit needs merging'}</h3>
        <p class="hint">${escapeHtml(ambiguousNote)}</p>
        <div class="link-cloud">${tokenLinks((profile.parentInstitutions || []).map(x => x.key).join('; '), 'institution')}</div>
      </section>` : ''}
      <section class="profile-columns">
        <div><h3>${escapeHtml(t('navAuthors'))}</h3>${profile.ambiguousSubunit ? `<p class="hint">${escapeHtml(state.lang === 'zh' ? '该节点暂不生成导师画像，避免把不同学校的同名院系混在一起。' : 'Scholar portrait is disabled for this ambiguous subunit.')}</p>` : renderClickableMiniBars(profile.authors, 'papers', 'author')}</div>
        <div><h3>${escapeHtml(t('venue'))}</h3>${renderMiniBars(profile.byVenue, 'papers')}</div>
      </section>
      <h3>${escapeHtml(t('recentPapers'))}</h3>
      ${profilePapers(profile.papers)}
    </section>
  `;
  bindProfileLinks();
}

function renderRankings(kind, options = {}) {
  if (options.history !== 'skip') writeRoute({ view: 'rankings', kind });
  state.currentView = 'rankings';
  state.detailCollapsed = true;
  applyDetailState();
  $('summary').innerHTML = '';
  $('pagination').innerHTML = '';
  const rows = kind === 'authors' ? state.professors : state.institutions;
  const title = kind === 'authors' ? t('authorRankings') : t('institutionRankings');
  $('results').classList.remove('compact');
  $('results').innerHTML = `
    <section class="ranking-page">
      <div class="ranking-head">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(state.language === 'zh' ? '基于当前本地数据库统计，姓名和机构仍需后续消歧。' : 'Computed from the local database; names and affiliations still need disambiguation.')}</p>
      </div>
      <div class="ranking-list">
        ${rows.map((row, index) => `
          <button class="ranking-card" type="button" data-rank-${kind === 'authors' ? 'author' : 'institution'}="${escapeHtml(row.name)}">
            <span class="rank-no">${index + 1}</span>
            <span class="rank-avatar">${escapeHtml(initials(row.name))}</span>
            <span class="rank-body"><strong>${escapeHtml(row.name)}</strong><em>${fmt(row.papers)} ${escapeHtml(t('summaryPapers'))}, ${fmt(row.sPlus)} S+</em></span>
            <span class="rank-score">${escapeHtml(row.authorScore || row.institutionScore)}</span>
          </button>
        `).join('')}
      </div>
    </section>
  `;
  document.querySelectorAll('[data-rank-author]').forEach(el => el.addEventListener('click', () => loadAuthor(el.dataset.rankAuthor)));
  document.querySelectorAll('[data-rank-institution]').forEach(el => el.addEventListener('click', () => loadInstitution(el.dataset.rankInstitution)));
}

function renderTopicEntityList(rows, type) {
  const attr = type === 'author' ? 'data-author-link' : 'data-institution-link';
  return `<div class="topic-entity-list">
    ${rows.slice(0, 12).map((row, index) => `<button class="topic-entity" type="button" ${attr}="${escapeHtml(row.name)}">
      <span>${index + 1}</span>
      <strong>${escapeHtml(row.name)}</strong>
      <em>${fmt(row.papers)} ${escapeHtml(t('summaryPapers'))} · S+ ${fmt(row.sPlus)} · ${escapeHtml(row.topicScore)}</em>
    </button>`).join('')}
  </div>`;
}

function renderTopicVenueList(rows) {
  return `<div class="topic-venue-list">
    ${rows.map(row => `<button class="topic-venue" type="button" data-topic-venue="${escapeHtml(row.key)}">
      <strong>${escapeHtml(row.key)}</strong>
      <span>${fmt(row.count)}</span>
    </button>`).join('')}
  </div>`;
}

function renderTopicCards(topics, selectedField) {
  return `<div class="topic-card-grid">
    ${topics.map(topic => `<button class="topic-card ${topic.field === selectedField ? 'active' : ''}" type="button" data-topic-field="${escapeHtml(topic.field)}">
      <strong>${escapeHtml(topic.field)}</strong>
      <span>${fmt(topic.papers)} ${escapeHtml(t('summaryPapers'))}</span>
      <em>S+ ${fmt(topic.sPlus)} · ${topic.firstYear}-${topic.lastYear}</em>
    </button>`).join('')}
  </div>`;
}

function renderSubtopics(field) {
  const subs = topicHierarchy[field] || [];
  if (!subs.length) return '';
  return `<div class="subtopic-bar">
    <strong>${escapeHtml(t('subtopics'))}:</strong>
    ${subs.map(sub => `<button class="chip" type="button" data-subtopic="${escapeHtml(sub)}">${escapeHtml(sub)}</button>`).join('')}
  </div>`;
}

function geoMetric(country, mode) {
  if (mode === 'institutions') return Number(country.topInstitutions?.length || 0);
  if (mode === 'topic') return Number(country.score || 0);
  return Number(country.recentScore || country.score || 0);
}

async function loadWorldMap() {
  if (state.geoWorldMap) return state.geoWorldMap;
  if (!state.geoWorldMapPromise) {
    state.geoWorldMapPromise = fetch('/data/world-countries-110m.geojson', { credentials: 'same-origin' })
      .then(res => {
        if (!res.ok) throw new Error(`World map failed: ${res.status}`);
        return res.json();
      })
      .then(prepareWorldMap);
  }
  state.geoWorldMap = await state.geoWorldMapPromise;
  return state.geoWorldMap;
}

function renderGeoMap(countries, selectedCode, mode, worldMap) {
  const max = Math.max(1, ...countries.map(country => geoMetric(country, mode)));
  const countryByFeature = new Map(countries.map(country => [countryFeatureCode(country.code), country]));
  const renderedFeatureCodes = new Set();
  const labelled = new Set(countries
    .filter(country => !geoDenseRegionCodes.has(country.code))
    .slice(0, 6)
    .map(country => country.code));
  if (selectedCode) labelled.add(selectedCode);
  const regionalGroups = [
    { title: 'East Asia', codes: ['CN', 'HK', 'MO', 'TW', 'KR', 'JP', 'SG'] },
    { title: 'Europe', codes: ['UK', 'NL', 'BE', 'DE', 'FR', 'CH', 'IT'] }
  ].map(group => ({
    ...group,
    countries: group.codes.map(code => countries.find(country => country.code === code)).filter(Boolean)
  })).filter(group => group.countries.length);
  return `<div class="geo-map-canvas" aria-label="${escapeHtml(t('geoIntelligence'))}">
    <svg viewBox="0 0 110 66" role="img" class="geo-map-bg">
      <defs>
        <linearGradient id="geoOcean" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f9fbff"></stop>
          <stop offset="100%" stop-color="#eef4fb"></stop>
        </linearGradient>
        <filter id="geoGlow" x="-30%" y="-70%" width="160%" height="220%">
          <feGaussianBlur stdDeviation=".95" result="blur"></feGaussianBlur>
          <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
        </filter>
      </defs>
      <rect x=".75" y=".75" width="108.5" height="64.5" rx="5.5" fill="url(#geoOcean)"></rect>
      <g class="geo-world-layer">
        ${(worldMap?.features || []).map(feature => {
          const country = countryByFeature.get(feature.code);
          const selected = country?.code === selectedCode;
          const value = country ? geoMetric(country, mode) : 0;
          const intensity = country ? Math.max(.18, Math.min(.95, value / max)) : 0;
          if (country) renderedFeatureCodes.add(feature.code);
          return `<path class="geo-world-country ${country ? 'has-data' : ''} ${selected ? 'active' : ''}"
            ${country ? `role="button" tabindex="0" data-geo-country="${escapeHtml(country.code)}"` : ''}
            style="--geo-alpha:${intensity.toFixed(3)}"
            d="${feature.path}">
            <title>${escapeHtml(country ? `${country.name}: ${Math.round(value)}` : feature.name)}</title>
          </path>`;
        }).join('')}
      </g>
      <g class="geo-hotspot-layer" filter="url(#geoGlow)">
        ${countries.flatMap(country => {
          const metric = geoMetric(country, mode);
          return geoHotspots(country, max, metric).map(spot => {
          const isActive = country.code === selectedCode;
          return `<g class="geo-hotspot ${isActive ? 'active' : ''}" role="button" tabindex="0" data-geo-country="${escapeHtml(country.code)}" style="--geo-hot-alpha:${spot.alpha.toFixed(3)}">
            <line x1="${spot.x.toFixed(2)}" y1="${spot.y.toFixed(2)}" x2="${spot.x.toFixed(2)}" y2="${(spot.y - spot.height).toFixed(2)}"></line>
            <circle cx="${spot.x.toFixed(2)}" cy="${spot.y.toFixed(2)}" r="${spot.radius.toFixed(2)}"></circle>
            <circle class="geo-hot-tip" cx="${spot.x.toFixed(2)}" cy="${(spot.y - spot.height).toFixed(2)}" r="${Math.max(.32, spot.radius * .34).toFixed(2)}"></circle>
            <title>${escapeHtml(country.name)} hotspot: ${Math.round(metric)}</title>
          </g>`;
        });}).join('')}
      </g>
      <g class="geo-country-layer">
        ${countries.map(country => {
          const featureCode = countryFeatureCode(country.code);
          const isPathBacked = renderedFeatureCodes.has(featureCode);
          const projected = geoCountryAnchor(country);
          const offset = geoLabelOffsets[country.code] || { dx: 0, dy: -1.8 };
          const shouldLabel = labelled.has(country.code) || (!isPathBacked && country.code === selectedCode);
          if (!shouldLabel) return '';
          return `<g class="geo-label ${country.code === selectedCode ? 'active' : ''} ${isPathBacked ? '' : 'marker-label'}" role="button" tabindex="0" data-geo-country="${escapeHtml(country.code)}">
            ${isPathBacked ? '' : `<circle class="geo-marker-dot" cx="${projected.x.toFixed(2)}" cy="${projected.y.toFixed(2)}" r=".75"></circle>`}
            <text x="${(projected.x + offset.dx).toFixed(2)}" y="${(projected.y + offset.dy).toFixed(2)}" text-anchor="middle">${escapeHtml(country.code)}</text>
          </g>`;
        }).join('')}
      </g>
    </svg>
    <div class="geo-inset-tray" aria-label="Dense region selectors">
      ${regionalGroups.map(group => `<section class="geo-inset-card">
        <div class="geo-inset-head">
          <strong>${escapeHtml(group.title)}</strong>
          <span>${group.countries.length} regions</span>
        </div>
        <div class="geo-inset-grid">
          ${group.countries.map(country => `<button class="geo-region-button ${country.code === selectedCode ? 'active' : ''}" type="button" data-geo-country="${escapeHtml(country.code)}">
            <span>${escapeHtml(country.code)}</span>
            <em>${fmt(country.papers)}</em>
          </button>`).join('')}
        </div>
      </section>`).join('')}
    </div>
  </div>`;
}

function renderGeoSharePie(countries, mode) {
  const rows = countries.slice(0, 7).map(country => ({
    key: country.code,
    name: country.name,
    count: Math.round(geoMetric(country, mode))
  }));
  const other = countries.slice(7).reduce((sum, country) => sum + geoMetric(country, mode), 0);
  if (other > 0) rows.push({ key: 'Other', name: 'Other', count: Math.round(other) });
  const total = Math.max(1, rows.reduce((sum, row) => sum + Number(row.count || 0), 0));
  let cursor = 0;
  const colors = ['#3654c8', '#1f9d73', '#6f7fb8', '#d18b2c', '#40a0c4', '#825ec9', '#cb5b7b', '#aab6c8'];
  const gradient = rows.map((row, index) => {
    const start = cursor / total * 100;
    cursor += Number(row.count || 0);
    const end = cursor / total * 100;
    return `${colors[index % colors.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  }).join(', ');
  return `<div class="geo-share">
    <div class="geo-pie" style="background: conic-gradient(${gradient});" role="img" aria-label="Country share"></div>
    <div class="geo-pie-legend">
      ${rows.map((row, index) => {
        const inner = `<i style="background:${colors[index % colors.length]}"></i>
          <span>${escapeHtml(row.name)}</span>
          <strong>${Math.round(Number(row.count || 0) / total * 100)}%</strong>`;
        if (row.key === 'Other') return `<div class="geo-pie-row muted">${inner}</div>`;
        return `<button class="geo-pie-row" type="button" data-geo-country="${escapeHtml(row.key)}">${inner}</button>`;
      }).join('')}
    </div>
  </div>`;
}

function renderGeoCountryDetail(country, mode) {
  if (!country) return `<div class="empty">${escapeHtml(t('geoHoverHint'))}</div>`;
  const trend = (country.byYear || []).map(row => ({
    key: row.year,
    count: mode === 'institutions' ? row.papers : Math.round(Number(row.score || 0))
  }));
  const topInstitutions = country.topInstitutions || [];
  return `
    <section class="geo-country-detail">
      <div class="geo-detail-head">
        <div>
          <p class="profile-kicker">${escapeHtml(country.region)}</p>
          <h3>${escapeHtml(country.name)}</h3>
        </div>
        <strong>${escapeHtml(country.code)}</strong>
      </div>
      <div class="profile-grid geo-metrics">
        <div class="metric"><span>${escapeHtml(t('summaryPapers'))}</span><strong>${fmt(country.papers)}</strong></div>
        <div class="metric"><span>${escapeHtml(t('sortScore'))}</span><strong>${escapeHtml(country.score)}</strong></div>
        <div class="metric"><span>${escapeHtml(t('summaryTopField'))}</span><strong>${escapeHtml(country.topField)}</strong></div>
        <div class="metric"><span>S+ / S / A</span><strong>${fmt(country.ranks?.sPlus)} / ${fmt(country.ranks?.s)} / ${fmt(country.ranks?.a)}</strong></div>
      </div>
      ${renderSparkBars(trend, t('geoTrend'), 'line')}
      <section class="geo-detail-columns">
        <div><h4>${escapeHtml(t('geoTopInstitutions'))}</h4>
          <div class="geo-institution-list">
            ${topInstitutions.length ? topInstitutions.map((row, index) => `<button class="geo-institution-row" type="button" data-institution-link="${escapeHtml(row.name)}">
              <span>${index + 1}</span>
              <strong>${escapeHtml(row.name)}</strong>
              <em>${fmt(row.count)} papers</em>
            </button>`).join('') : `<p class="hint">No matched institutions yet.</p>`}
          </div>
        </div>
        <div><h4>${escapeHtml(t('domain'))}</h4>${renderMiniBars(country.byField || [], 'papers')}</div>
      </section>
    </section>
  `;
}

function regionMomentum(regionTrends) {
  const currentYear = new Date().getFullYear();
  const recentStart = currentYear - 9;
  const previousStart = currentYear - 19;
  const rows = new Map();
  for (const row of regionTrends || []) {
    const item = rows.get(row.region) || { region: row.region, recent: 0, previous: 0, papers: 0 };
    const year = Number(row.year || 0);
    if (year >= recentStart) item.recent += Number(row.score || 0);
    else if (year >= previousStart) item.previous += Number(row.score || 0);
    item.papers += Number(row.papers || 0);
    rows.set(row.region, item);
  }
  return [...rows.values()]
    .map(row => ({ ...row, delta: Math.round((row.recent - row.previous) * 10) / 10 }))
    .sort((a, b) => b.recent - a.recent || b.delta - a.delta);
}

async function renderGeo(field = '', options = {}) {
  const mode = options.mode || routeFromLocation().mode || 'overall';
  const cacheKey = field || '__all__';
  const query = field ? `?field=${encodeURIComponent(field)}` : '';
  const dataPromise = (!options.refresh && state.geoCache.get(cacheKey))
    ? Promise.resolve(state.geoCache.get(cacheKey))
    : api(`/api/geo${query}`).then(value => {
      state.geoCache.set(cacheKey, value);
      return value;
    });
  const [data, worldMap] = await Promise.all([dataPromise, loadWorldMap()]);
  const selectedCode = options.country || routeFromLocation().country || data.countries[0]?.code || '';
  const selectedCountry = data.countries.find(country => country.code === selectedCode) || data.countries[0];
  if (options.history !== 'skip') writeRoute({ view: 'geo', field: data.field || '', mode, country: selectedCountry?.code || '' });
  state.currentView = 'geo';
  state.detailCollapsed = true;
  applyDetailState();
  $('summary').innerHTML = '';
  $('pagination').innerHTML = '';
  $('results').classList.remove('compact');
  const momentum = regionMomentum(data.regionTrends);
  const fieldOptions = ['Power Management', ...(data.fields || []).filter(item => item !== 'Power Management')];
  $('results').innerHTML = `
    <section class="geo-page">
      <div class="geo-hero">
        <div>
          <p class="profile-kicker">${escapeHtml(t('geoIntelligence'))}</p>
          <h2>${escapeHtml(mode === 'topic' && data.field ? data.field : t('geoOverall'))}</h2>
          <p>${fmt(data.countries.reduce((sum, country) => sum + country.papers, 0))} ${escapeHtml(t('geoPapers'))} / ${fmt(data.skippedWithoutCountry)} unmapped affiliations</p>
        </div>
        <div class="geo-controls">
          <button class="profile-filter ${mode === 'overall' ? 'active' : ''}" type="button" data-geo-mode="overall">${escapeHtml(t('geoOverall'))}</button>
          <button class="profile-filter ${mode === 'institutions' ? 'active' : ''}" type="button" data-geo-mode="institutions">${escapeHtml(t('geoInstitutions'))}</button>
          <button class="profile-filter ${mode === 'topic' ? 'active' : ''}" type="button" data-geo-mode="topic">${escapeHtml(t('geoTopic'))}</button>
          <select id="geoFieldSelect" aria-label="${escapeHtml(t('geoTopicPick'))}">
            <option value="">All topics</option>
            ${fieldOptions.map(item => `<option value="${escapeHtml(item)}" ${item === data.field ? 'selected' : ''}>${escapeHtml(item === 'Power Management' ? 'PMIC / Power Management' : item)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="geo-grid">
        <section class="geo-map-panel">
          ${renderGeoMap(data.countries, selectedCountry?.code || '', mode, worldMap)}
          <p class="hint">${escapeHtml(t('geoHoverHint'))}</p>
          <p class="hint">City-level rays are schematic hotspots until institution geocoding is connected.</p>
          <section class="geo-map-insights">
            <div class="geo-card">
              <h3>${escapeHtml(t('geoTrend'))}</h3>
              ${renderMiniBars(momentum.map(row => ({ key: row.region, count: Math.round(row.recent) })), 'strength')}
            </div>
            <div class="geo-card">
              <h3>Country share</h3>
              ${renderGeoSharePie(data.countries, mode)}
            </div>
          </section>
        </section>
        <aside class="geo-side" id="geoCountryDetail">${renderGeoCountryDetail(selectedCountry, mode)}</aside>
      </div>
      <section class="geo-lower">
        <div class="geo-card">
          <h3>${escapeHtml(t('geoTopCountries'))}</h3>
          <div class="geo-country-list">
            ${data.countries.slice(0, 12).map((country, index) => `<button class="geo-country-row" type="button" data-geo-country="${escapeHtml(country.code)}">
              <span>${index + 1}</span><strong>${escapeHtml(country.name)}</strong><em>${fmt(country.papers)} papers / ${escapeHtml(country.score)}</em>
            </button>`).join('')}
          </div>
        </div>
      </section>
    </section>
  `;
  const updateCountry = (code, write = false) => {
    const country = data.countries.find(item => item.code === code) || data.countries[0];
    if (!country) return;
    document.querySelectorAll('[data-geo-country]').forEach(item => item.classList.toggle('active', item.dataset.geoCountry === country.code));
    $('geoCountryDetail').innerHTML = renderGeoCountryDetail(country, mode);
    bindProfileLinks();
    if (write) writeRoute({ view: 'geo', field: data.field || '', mode, country: country.code });
  };
  document.querySelectorAll('.geo-world-country.has-data, .geo-label, .geo-hotspot').forEach(button => {
    button.addEventListener('mouseenter', () => updateCountry(button.dataset.geoCountry, false));
    button.addEventListener('focus', () => updateCountry(button.dataset.geoCountry, false));
    button.addEventListener('click', () => updateCountry(button.dataset.geoCountry, true));
    button.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        updateCountry(button.dataset.geoCountry, true);
      }
    });
  });
  document.querySelectorAll('.geo-country-row, .geo-pie-row[data-geo-country], .geo-region-button').forEach(button => {
    button.addEventListener('click', () => updateCountry(button.dataset.geoCountry, true));
  });
  document.querySelectorAll('[data-geo-mode]').forEach(button => {
    button.addEventListener('click', () => renderGeo(data.field || '', { mode: button.dataset.geoMode }));
  });
  $('geoFieldSelect')?.addEventListener('change', event => renderGeo(event.target.value, { mode: event.target.value ? 'topic' : mode }));
  bindProfileLinks();
}

async function renderTopics(field = '', options = {}) {
  const topics = await api('/api/topics');
  const selectedField = field || topics[0]?.field || '';
  if (options.history !== 'skip') writeRoute({ view: 'topics', field: selectedField });
  state.currentView = 'topics';
  state.detailCollapsed = true;
  applyDetailState();
  $('summary').innerHTML = '';
  $('pagination').innerHTML = '';
  $('results').classList.remove('compact');
  if (!selectedField) {
    $('results').innerHTML = `<div class="empty">${escapeHtml(t('topicOverview'))}</div>`;
    return;
  }
  const detail = await api(`/api/topics/detail?field=${encodeURIComponent(selectedField)}`);
  const sPlusShare = Math.round(Number(detail.ranks?.sPlus || 0) / Math.max(1, detail.papers) * 100);
  const summaryText = t('topicSummaryText')
    .replace('{field}', detail.field)
    .replace('{papers}', fmt(detail.papers))
    .replace('{peakYear}', String(detail.peakYear?.year || '-'))
    .replace('{splus}', String(sPlusShare));
  $('results').innerHTML = `
    <section class="topic-page">
      <div class="topic-hero">
        <div>
          <p class="profile-kicker">${escapeHtml(t('topicIntelligence'))}</p>
          <h2>${escapeHtml(detail.field)}</h2>
          <p>${escapeHtml(summaryText)}</p>
        </div>
        <button class="button primary" type="button" id="topicSearch">${escapeHtml(t('setAsSearch'))}</button>
      </div>
      ${renderTopicCards(topics, selectedField)}
      ${renderSubtopics(selectedField)}
      <section class="profile-grid wide-profile-grid">
        <div class="metric"><span>${escapeHtml(t('summaryPapers'))}</span><strong>${fmt(detail.papers)}</strong></div>
        <div class="metric"><span>${escapeHtml(t('sortScore'))}</span><strong>${escapeHtml(detail.avgScore)}</strong></div>
        <div class="metric"><span>S+ / S / A</span><strong>${fmt(detail.ranks.sPlus)} / ${fmt(detail.ranks.s)} / ${fmt(detail.ranks.a)}</strong></div>
        <div class="metric"><span>${escapeHtml(t('topicTrend'))}</span><strong>${escapeHtml(detail.peakYear?.year || '-')}</strong></div>
      </section>
      <section class="profile-analytics">
        ${renderSparkBars(detail.byYear.map(row => ({ key: row.year, count: row.count })), t('topicTrend'), 'bar')}
        <div class="spark-panel"><h3>${escapeHtml(t('rankDistribution'))}</h3>${renderRankDonut(detail.ranks)}</div>
        <div class="spark-panel"><h3>${escapeHtml(t('topicVenues'))}</h3>${renderTopicVenueList(detail.byVenue.slice(0, 8))}</div>
      </section>
      <section class="topic-grid">
        <div><h3>${escapeHtml(t('topicLeaders'))}</h3>${renderTopicEntityList(detail.authors, 'author')}</div>
        <div><h3>${escapeHtml(t('topicInstitutions'))}</h3>${renderTopicEntityList(detail.institutions, 'institution')}</div>
      </section>
      ${profilePapers(detail.representativePapers, t('topicPapers'))}
    </section>
  `;
  document.querySelectorAll('[data-topic-field]').forEach(el => el.addEventListener('click', () => renderTopics(el.dataset.topicField)));
  document.querySelectorAll('[data-topic-venue]').forEach(el => el.addEventListener('click', () => {
    $('venue').value = el.dataset.topicVenue;
    $('field').value = selectedField;
    searchFirstPage();
  }));
  $('topicSearch')?.addEventListener('click', () => {
    $('q').value = selectedField;
    $('field').value = selectedField;
    $('semantic').checked = true;
    searchFirstPage();
  });
  document.querySelectorAll('[data-subtopic]').forEach(el => el.addEventListener('click', () => {
    $('q').value = el.dataset.subtopic;
    $('field').value = selectedField;
    $('semantic').checked = true;
    searchFirstPage();
  }));
  bindProfileLinks();
}

async function search(options = {}) {
  state.currentView = 'papers';
  setActivePanel('papers');
  if (options.history !== 'skip') writeRoute(currentSearchRoute(), options.history || 'replace');
  $('results').innerHTML = '<div class="loading">Searching SiliconScope database...</div>';
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
      search({ history: 'replace' });
    }
  });
  $('nextPage').addEventListener('click', () => {
    if (state.page < pages) {
      state.page += 1;
      search({ history: 'replace' });
    }
  });
  document.querySelectorAll('.page-button[data-page]').forEach(button => {
    button.addEventListener('click', () => {
      const page = Number(button.dataset.page);
      if (page && page !== state.page) {
        state.page = page;
        search({ history: 'replace' });
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
  document.querySelectorAll('.paper').forEach(el => el.addEventListener('click', event => loadPaper(Number(el.dataset.id), { anchorY: event.clientY })));
}

function citationAuthorList(authors, style = 'ieee') {
  const names = splitProfileList(authors, 'author');
  if (!names.length) return 'Unknown';
  if (style === 'apa') {
    if (names.length > 6) return `${names.slice(0, 6).join(', ')}, et al.`;
    return names.join(', ');
  }
  if (names.length > 3) return `${names.slice(0, 3).join(', ')}, et al.`;
  return names.join(', ');
}

function citationFormats(paper) {
  const authorsIeee = citationAuthorList(paper.authors, 'ieee');
  const authorsApa = citationAuthorList(paper.authors, 'apa');
  const title = cleanDisplayText(paper.title);
  const venue = paper.publication_title || paper.venue || '';
  const year = paper.year || '';
  const doi = paper.doi ? ` doi: ${paper.doi}` : '';
  const key = `${splitProfileList(paper.authors, 'author')[0] || 'paper'}${year}`.replace(/[^a-z0-9]+/gi, '').slice(0, 28) || `paper${paper.id}`;
  return {
    ieee: `${authorsIeee}, "${title}," ${venue}, ${year}.${doi}`,
    apa: `${authorsApa}. (${year}). ${title}. ${venue}.${paper.doi ? ` https://doi.org/${paper.doi}` : ''}`,
    bibtex: `@article{${key},\n  title = {${title}},\n  author = {${splitProfileList(paper.authors, 'author').join(' and ')}},\n  journal = {${venue}},\n  year = {${year}},\n  doi = {${paper.doi || ''}}\n}`
  };
}

function renderCitationBox(paper) {
  const formats = citationFormats(paper);
  return `<section class="citation-box">
    <div class="citation-head">
      <h3>${escapeHtml(t('quickCitation'))}</h3>
      <p class="hint" id="citationMsg"></p>
    </div>
    <div class="citation-actions">
      <button class="button" type="button" data-copy-citation="ieee">${escapeHtml(t('copyIeee'))}</button>
      <button class="button" type="button" data-copy-citation="apa">${escapeHtml(t('copyApa'))}</button>
      <button class="button" type="button" data-copy-citation="bibtex">${escapeHtml(t('copyBibtex'))}</button>
    </div>
    <pre class="citation-preview" id="citationPreview">${escapeHtml(formats.ieee)}</pre>
  </section>`;
}

function bindCitationCopy(paper) {
  const formats = citationFormats(paper);
  document.querySelectorAll('[data-copy-citation]').forEach(button => {
    button.addEventListener('click', async () => {
      const style = button.dataset.copyCitation;
      const value = formats[style] || formats.ieee;
      $('citationPreview').textContent = value;
      try {
        await navigator.clipboard.writeText(value);
        $('citationMsg').textContent = t('copied');
      } catch {
        $('citationPreview').focus?.();
        $('citationMsg').textContent = 'Copy blocked; select the citation text.';
      }
    });
  });
}

async function loadPaper(id, options = {}) {
  if (options.history !== 'skip') writeRoute({ ...currentSearchRoute(), view: 'paper', id: String(id) });
  state.activeId = id;
  state.detailCollapsed = false;
  document.body.classList.add('paper-detail-active');
  const anchorTop = Number.isFinite(options.anchorY)
    ? Math.max(12, Math.min(Math.round(options.anchorY - 28), Math.max(12, window.innerHeight - 420)))
    : 12;
  document.documentElement.style.setProperty('--detail-rail-top', `${anchorTop}px`);
  applyDetailState();
  if (state.currentView === 'papers') renderResults(state.resultMeta?.engine || '');
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
    ${renderCitationBox(paper)}
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
  bindCitationCopy(paper);
  bindProfileLinks();
  renderPaperDiscussion(id);
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
  if (state.currentView === 'papers') await search({ history: 'skip' });
}

async function renderPaperDiscussion(paperId) {
  const box = $('discussionBox');
  if (!box) return;
  try {
    const comments = await api(`/api/papers/${paperId}/comments`);
    const commentTypes = ['Question', 'Technical Note', 'Reproduction Note', 'Related Work', 'Correction', 'Reading Summary'];
    box.innerHTML = `
      <div class="discussion-list">
        ${comments.length ? comments.map(c => `
          <div class="discussion-item">
            <div class="discussion-meta">
              <strong>${escapeHtml(c.displayName)}</strong>
              ${c.verified ? '<span class="badge verified">Verified</span>' : '<span class="badge">Unverified</span>'}
              <span class="pill">${escapeHtml(c.comment_type)}</span>
              <em>${escapeHtml(c.created_at?.slice(0, 10) || '')}</em>
            </div>
            <p>${escapeHtml(c.body)}</p>
          </div>
        `).join('') : `<p class="hint">${escapeHtml(t('noComments'))}</p>`}
      </div>
      <div class="discussion-form">
        <label class="field">
          <span>${escapeHtml(t('commentType'))}</span>
          <select id="commentType">
            ${commentTypes.map(type => `<option>${escapeHtml(type)}</option>`).join('')}
          </select>
        </label>
        <label class="field wide">
          <span>${escapeHtml(t('addComment'))}</span>
          <textarea id="commentBody" placeholder="Discuss methodology, ask questions, or share reproduction notes..."></textarea>
        </label>
        <button class="button" id="submitComment" type="button">${escapeHtml(t('submitComment'))}</button>
        <p class="hint">${escapeHtml(t('reviewDisclaimer'))}</p>
      </div>
    `;
    $('submitComment')?.addEventListener('click', async () => {
      const body = $('commentBody').value.trim();
      if (!body) return;
      await api(`/api/papers/${paperId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ commentType: $('commentType').value, body })
      });
      await renderPaperDiscussion(paperId);
    });
  } catch (err) {
    box.innerHTML = `<p class="hint">Discussion loading failed: ${escapeHtml(err.message)}</p>`;
  }
}

async function renderMentorReviews(authorName) {
  const box = $('reviewBox');
  if (!box) return;
  try {
    const data = await api(`/api/authors/${encodeURIComponent(authorName)}/reviews`);
    const { reviews, stats } = data;
    const threshold = stats.total < 3 ? 'insufficient' : stats.total < 5 ? 'broad' : 'full';
    const relationshipTypes = ['Former Student', 'Current Student', 'Collaborator', 'External Reviewer'];
    box.innerHTML = `
      <div class="review-stats">
        <div class="metric"><span>Reviews</span><strong>${fmt(stats.total)}</strong></div>
        <div class="metric"><span>Verified</span><strong>${fmt(stats.verified)}</strong></div>
      </div>
      <div class="review-threshold">
        ${threshold === 'insufficient' ? `<p class="hint">${escapeHtml(t('insufficientData'))}</p>` : ''}
        ${threshold === 'broad' ? `<p class="hint">${escapeHtml(t('broadDistribution'))}</p>` : ''}
      </div>
      <div class="review-list">
        ${reviews.map(r => `
          <div class="review-item">
            <div class="review-meta">
              <strong>${escapeHtml(r.public_alias)}</strong>
              <span class="pill">${escapeHtml(r.relationship_type || 'Reviewer')}</span>
              <em>${escapeHtml(r.created_at?.slice(0, 10) || '')}</em>
            </div>
            ${r.scores && Object.keys(r.scores).length ? `
              <div class="review-scores">
                ${Object.entries(r.scores).map(([k, v]) => `<span><em>${escapeHtml(k)}</em><strong>${escapeHtml(v)}</strong></span>`).join('')}
              </div>
            ` : ''}
            ${r.strengths_text ? `<p><strong>Strengths:</strong> ${escapeHtml(r.strengths_text)}</p>` : ''}
            ${r.cautions_text ? `<p><strong>Cautions:</strong> ${escapeHtml(r.cautions_text)}</p>` : ''}
            ${r.fit_text ? `<p><strong>Fit:</strong> ${escapeHtml(r.fit_text)}</p>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="review-form">
        <label class="field">
          <span>${escapeHtml(t('reviewAlias'))}</span>
          <input id="reviewAlias" type="text" placeholder="Verified Reviewer" value="Verified Reviewer">
        </label>
        <label class="field">
          <span>${escapeHtml(t('reviewRelationship'))}</span>
          <select id="reviewRelationship">
            ${relationshipTypes.map(type => `<option>${escapeHtml(type)}</option>`).join('')}
          </select>
        </label>
        <label class="field wide">
          <span>${escapeHtml(t('reviewStrengths'))}</span>
          <textarea id="reviewStrengths" placeholder="导师的学术优势、指导风格亮点、资源支持等..."></textarea>
        </label>
        <label class="field wide">
          <span>${escapeHtml(t('reviewCautions'))}</span>
          <textarea id="reviewCautions" placeholder="可能需要注意的地方，如指导频率、性格特点、毕业要求等..."></textarea>
        </label>
        <label class="field wide">
          <span>${escapeHtml(t('reviewFit'))}</span>
          <textarea id="reviewFit" placeholder="适合什么样的学生？例如：自主性强的学生、需要手把手指导的学生、偏工程还是偏理论..."></textarea>
        </label>
        <button class="button primary" id="submitReview" type="button">${escapeHtml(t('submitReview'))}</button>
        <p class="hint">${escapeHtml(t('mentorDisclaimer'))}</p>
      </div>
    `;
    $('submitReview')?.addEventListener('click', async () => {
      const publicAlias = $('reviewAlias').value.trim() || 'Verified Reviewer';
      const relationshipType = $('reviewRelationship').value;
      const strengthsText = $('reviewStrengths').value.trim();
      const cautionsText = $('reviewCautions').value.trim();
      const fitText = $('reviewFit').value.trim();
      if (!strengthsText && !cautionsText && !fitText) return;
      await api(`/api/authors/${encodeURIComponent(authorName)}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ publicAlias, relationshipType, strengthsText, cautionsText, fitText, scores: {} })
      });
      await renderMentorReviews(authorName);
    });
  } catch (err) {
    box.innerHTML = `<p class="hint">Reviews loading failed: ${escapeHtml(err.message)}</p>`;
  }
}

async function importDoi() {
  const doi = $('doiInput').value.trim();
  if (!doi) return;
  $('importStatus').textContent = 'Importing metadata...';
  const paper = await api('/api/import/doi', { method: 'POST', body: JSON.stringify({ doi }) });
  $('importStatus').textContent = `Imported: ${cleanDisplayText(paper.title)}`;
  $('doiInput').value = '';
  await loadStats();
  await search({ history: 'replace' });
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
  await search({ history: 'replace' });
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

function searchFirstPage(options = {}) {
  state.page = 1;
  return search(options);
}

async function bootApp() {
  showApp();
  applyLanguage();
  applyNavState();
  applyDetailState();
  applyFilterState();
  await loadStats();
  renderTopicChips();
  setTimeout(() => {
    loadWorldMap().catch(() => {});
    api('/api/geo').then(data => state.geoCache.set('__all__', data)).catch(() => {});
    api('/api/geo?field=Power%20Management').then(data => state.geoCache.set('Power Management', data)).catch(() => {});
  }, 400);
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
  $('filterCollapse').addEventListener('click', () => {
    state.filtersCollapsed = !state.filtersCollapsed;
    applyFilterState();
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
  if (!state.commandStripListenerBound) {
    $('commandStrip').addEventListener('click', event => {
      const button = event.target.closest('[data-panel-jump]');
      if (button) openPanelTarget(button.dataset.panelJump);
    });
    state.commandStripListenerBound = true;
  }
  document.querySelectorAll('[data-panel-jump]').forEach(button => {
    if (button.closest('#commandStrip')) return;
    button.addEventListener('click', () => {
      openPanelTarget(button.dataset.panelJump);
    });
  });
  document.querySelectorAll('.section-tab').forEach(button => {
    button.addEventListener('click', () => {
      switchSection(button.dataset.section);
    });
  });
  if (!state.routeListenerBound) {
    window.addEventListener('popstate', event => {
      restoreRoute(event.state || routeFromLocation()).catch(err => {
        $('results').innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
      });
    });
    state.routeListenerBound = true;
  }
  const initialRoute = routeFromLocation();
  const hasRoute = window.location.search.length > 1;
  if (hasRoute) {
    history.replaceState(initialRoute, '', routeUrl(initialRoute));
    await restoreRoute(initialRoute);
  } else {
    await search({ history: 'replace' });
  }
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
  $('loginTitle').textContent = auth.appName || 'SiliconScope';
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
async function switchSection(section, options = {}) {
  state.activeSection = section;
  document.body.classList.toggle('mentor-section', section === 'mentors');
  document.querySelectorAll('.section-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.section === section);
  });
  const paperTabs = $('paperTabs');
  const mentorTabs = $('mentorTabs');
  if (paperTabs) paperTabs.hidden = section !== 'papers';
  if (mentorTabs) mentorTabs.hidden = section !== 'mentors';
  if (section === 'mentors') {
    $('sidebar').hidden = true;
    if (options.renderDefault !== false) await renderMentorInstitutions(options);
  } else {
    document.body.classList.remove('mentor-section');
    $('sidebar').hidden = false;
    await searchFirstPage({ history: 'replace' });
  }
}

async function renderMentorInstitutionsLegacy(options = {}) {
  state.currentView = 'mentor-institutions';
  if (options.history !== 'skip') writeRoute({ view: 'mentor-institutions' }, options.history || 'push');
  state.detailCollapsed = true;
  applyDetailState();
  $('summary').innerHTML = '';
  $('pagination').innerHTML = '';
  $('results').classList.remove('compact');
  $('results').innerHTML = '<div class="loading">Loading institutions...</div>';
  $('detail').innerHTML = `
    <div class="empty detail-empty">
      <strong>${escapeHtml(t('selectMentor'))}</strong>
    </div>`;
  try {
    if (!state.mentorInstitutionCache) {
      state.mentorInstitutionCache = await api('/api/mentor/institutions');
    }
    const institutions = state.mentorInstitutionCache;
    const query = String(state.mentorInstitutionQuery || '').trim().toLowerCase();
    const filteredInstitutions = query
      ? institutions.filter(inst => [inst.name, inst.qs?.name, inst.qs?.region].join(' ').toLowerCase().includes(query))
      : institutions;
    const visibleInstitutions = filteredInstitutions.slice(0, state.mentorInstitutionLimit);
    $('results').innerHTML = `
      <section class="mentor-institutions-page">
        <div class="ranking-head">
          <h2>${escapeHtml(state.language === 'zh' ? 'IC 导师机构索引' : 'IC Mentor Institutions')}</h2>
          <p>${escapeHtml(state.language === 'zh' ? '按 QS 世界排名和 IC 论文数量排序。点击查看导师列表。' : 'Sorted by QS world rank and IC paper volume. Click to view mentors.')}</p>
        </div>
        <div class="mentor-index-toolbar">
          <label class="mentor-index-search">
            <span>${escapeHtml(state.language === 'zh' ? '搜索机构' : 'Search institution')}</span>
            <input id="mentorInstitutionSearch" type="search" value="${escapeHtml(state.mentorInstitutionQuery)}" placeholder="MIT, Tsinghua, HKUST...">
          </label>
          <div class="mentor-index-count">
            ${escapeHtml(state.language === 'zh'
              ? `显示 ${fmt(visibleInstitutions.length)} / ${fmt(filteredInstitutions.length)} 个机构，共 ${fmt(institutions.length)} 个`
              : `Showing ${fmt(visibleInstitutions.length)} / ${fmt(filteredInstitutions.length)} of ${fmt(institutions.length)}`)}
          </div>
        </div>
        <div class="institution-grid">
          ${visibleInstitutions.map(inst => `
            <button class="institution-card" type="button" data-institution="${escapeHtml(inst.name)}">
              <div class="institution-card-header">
                <span class="institution-name">${escapeHtml(inst.name)}</span>
                ${inst.qs ? `<span class="qs-badge" title="QS World ${inst.qs.qs_world_rank}">QS ${inst.qs.qs_world_rank}</span>` : ''}
              </div>
              <div class="institution-card-body">
                <div class="metric"><span>${escapeHtml(t('institutionMentors'))}</span><strong>${fmt(inst.mentorCount)}</strong></div>
                <div class="metric"><span>${escapeHtml(t('institutionPapers'))}</span><strong>${fmt(inst.papers)}</strong></div>
                <div class="metric"><span>${escapeHtml(t('mentorScore'))}</span><strong>${escapeHtml(inst.institutionScore)}</strong></div>
                ${inst.qs ? `<div class="metric"><span>${escapeHtml(t('institutionRegionRank'))}</span><strong>${escapeHtml(inst.qs.region)} ${inst.qs.qs_region_rank}</strong></div>` : ''}
              </div>
              <div class="institution-card-footer">
                <span>S+ ${fmt(inst.sPlus)}</span> · <span>S ${fmt(inst.s)}</span> · <span>A ${fmt(inst.a)}</span>
              </div>
            </button>
          `).join('')}
        </div>
      </section>
    `;
    document.querySelectorAll('[data-institution]').forEach(el => {
      el.addEventListener('click', () => renderMentorByInstitution(el.dataset.institution));
    });
  } catch (err) {
    $('results').innerHTML = `<div class="empty">Failed to load institutions: ${escapeHtml(err.message)}</div>`;
  }
}

async function renderMentorByInstitutionLegacy(name) {
  if (!name) return;
  state.currentView = 'mentor-institution';
  state.detailCollapsed = true;
  applyDetailState();
  $('summary').innerHTML = '';
  $('pagination').innerHTML = '';
  $('results').classList.remove('compact');
  $('results').innerHTML = '<div class="loading">Loading mentors...</div>';
  $('detail').innerHTML = `
    <div class="empty detail-empty">
      <strong>${escapeHtml(t('selectMentor'))}</strong>
    </div>`;
  try {
    const data = await api(`/api/mentor/institutions/${encodeURIComponent(name)}${mentorRecentQuery()}`);
    const ambiguousMentorNote = mentorText(
      '这个名称更像二级院系/研究中心，不是唯一学校实体。当前先隐藏导师候选，下面列出可能的上级机构；后续接入 IEEE 作者-单位映射后再精确归并。',
      'This looks like a subunit rather than a unique institution entity. Mentor candidates are hidden for now; possible parent institutions are listed below until author-affiliation mapping is connected.'
    );
    $('results').innerHTML = `
      <section class="mentor-list-page">
        <div class="ranking-head">
          <h2>${escapeHtml(data.institution)}</h2>
          <div class="institution-qs-bar">
            ${data.qs ? `
              <span class="qs-badge large">QS World ${data.qs.qs_world_rank}</span>
              <span class="qs-badge">${escapeHtml(data.qs.region)} ${data.qs.qs_region_rank}</span>
            ` : '<span class="qs-badge">QS N/A</span>'}
            <span class="pill">${fmt(data.mentors.length)} ${escapeHtml(t('institutionMentors'))}</span>
          </div>
          <div class="topic-subcategory-bar">
            ${data.domains.slice(0, 8).map(d => `<span class="chip">${escapeHtml(d.key)} (${d.count})</span>`).join('')}
          </div>
          <label class="mentor-index-check inline">
            <input id="mentorRecentOnly" type="checkbox" ${state.mentorRecentOnly ? 'checked' : ''}>
            <span>${escapeHtml(mentorText('近8年', 'Recent 8 years'))}</span>
          </label>
          <button class="button" id="backToInstitutions" type="button">${escapeHtml(t('backToInstitutions'))}</button>
        </div>
        <div class="ranking-list">
          ${data.mentors.map((m, index) => `
            <button class="ranking-card mentor-ranking-card" type="button" data-mentor="${escapeHtml(m.name)}">
              <span class="rank-no">${index + 1}</span>
              <span class="rank-avatar">${escapeHtml(initials(m.name))}</span>
              <span class="rank-body">
                <strong>${escapeHtml(m.name)}</strong>
                <em>${fmt(m.papers)} ${escapeHtml(t('mentorPapers'))} · S+ ${fmt(m.sPlus)} · Score ${escapeHtml(m.authorScore)}</em>
              </span>
              <span class="rank-score">${escapeHtml(m.authorScore)}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
    bindMentorRecentToggle(() => renderMentorByInstitution(name, { history: 'skip' }));
    $('backToInstitutions')?.addEventListener('click', () => renderMentorInstitutions());
    document.querySelectorAll('[data-mentor]').forEach(el => {
      el.addEventListener('click', () => loadMentorProfile(el.dataset.mentor));
    });
  } catch (err) {
    $('results').innerHTML = `<div class="empty">Failed to load mentors: ${escapeHtml(err.message)}</div>`;
  }
}

async function loadMentorProfileLegacy(name) {
  if (!name) return;
  state.currentView = 'mentor-profile';
  state.detailCollapsed = false;
  applyDetailState();
  $('summary').innerHTML = '';
  $('pagination').innerHTML = '';
  $('results').classList.remove('compact');
  $('results').innerHTML = '<div class="loading">Loading mentor profile...</div>';
  try {
    const profile = await api(`/api/mentor/authors/${encodeURIComponent(name)}`);
    const paperCount = profile.paperCount ?? (Array.isArray(profile.papers) ? profile.papers.length : 0);
    const strength = yearlySeriesFromPapers(profile.papers, 'score');
    const activity = yearlySeriesFromPapers(profile.papers, 'count');
    const domains = profile.byDomain?.slice(0, 6) || [];
    const { reviews, reviewStats } = profile;
    const threshold = (reviewStats?.total || 0) < 3 ? 'insufficient' : (reviewStats?.total || 0) < 5 ? 'broad' : 'full';
    $('results').innerHTML = `
      <section class="scholar-profile">
        <div class="profile-hero compact-profile-hero">
          ${renderPhotoPlaceholder()}
          <div class="profile-main">
            <p class="profile-kicker">${escapeHtml(t('profileSummary'))}</p>
            <h2>${escapeHtml(profile.name)}</h2>
            <div class="profile-tags">
              <span>${fmt(paperCount)} ${escapeHtml(t('summaryPapers'))}</span>
              <span>${escapeHtml(t('sortScore'))} ${escapeHtml(profile.authorScore)}</span>
              ${profile.qs ? `<span class="qs-badge">${escapeHtml(profile.qs?.name || profile.primaryInstitution)} QS ${profile.qs?.qs_world_rank || 'N/A'}</span>` : ''}
            </div>
            <div class="actions">
              <a class="primary" target="_blank" href="${escapeHtml(profile.external.googleScholar)}">Scholar</a>
              <a target="_blank" href="${escapeHtml(profile.external.webSearch)}">Web search</a>
              <button class="button primary" id="writeReviewBtn" type="button">${escapeHtml(t('writeReview'))}</button>
            </div>
          </div>
        </div>
        <div class="profile-domain-bar">
          ${domains.map(d => `<span class="chip">${escapeHtml(d.key)} (${d.count})</span>`).join('')}
        </div>
        ${renderProfileSummary(profile, paperCount)}
        ${renderSparkBars(strength, t('careerStrength'), 'line')}
        ${renderSparkBars(activity, t('yearlyActivity'), 'bar')}
        <section class="profile-side-panel">
          <h3>${escapeHtml(t('rankDistribution'))}</h3>
          ${renderRankDonut(profile.ranks)}
        </section>
        <section class="profile-side-panel">
          <h3>${escapeHtml(t('collaboratorNetwork'))}</h3>
          ${renderClickableMiniBars(profile.coauthors.slice(0, 16), 'papers', 'author')}
        </section>
        <section class="profile-side-panel">
          <h3>${escapeHtml(t('institutionHistory'))}</h3>
          <div class="link-cloud">${tokenLinks(profile.institutions.map(x => x.key).join('; '), 'institution')}</div>
        </section>

        <section class="profile-side-panel" style="border-color:var(--accent);background:var(--accent-soft)">
          <h3>📝 ${escapeHtml(t('mentorReviews'))}</h3>
          <div class="review-stats" style="margin-bottom:12px">
            <div class="metric"><span>Reviews</span><strong>${fmt(reviewStats?.total || 0)}</strong></div>
            <div class="metric"><span>Verified</span><strong>${fmt(reviewStats?.verified || 0)}</strong></div>
          </div>
          ${threshold === 'insufficient' ? `<p class="hint">${escapeHtml(t('insufficientData'))}</p>` : ''}
          ${threshold === 'broad' ? `<p class="hint">${escapeHtml(t('broadDistribution'))}</p>` : ''}
          <div class="review-list" style="margin-bottom:0">
            ${(reviews || []).map(r => `
              <div class="review-item">
                <div class="review-meta">
                  <strong>${escapeHtml(r.public_alias)}</strong>
                  <span class="pill">${escapeHtml(r.relationship_type || 'Reviewer')}</span>
                  <em>${escapeHtml(r.created_at?.slice(0, 10) || '')}</em>
                </div>
                ${r.scores && Object.keys(r.scores).length ? `
                  <div class="review-scores">
                    ${Object.entries(r.scores).map(([k, v]) => `<span><em>${escapeHtml(k)}</em><strong>${escapeHtml(v)}</strong></span>`).join('')}
                  </div>
                ` : ''}
                ${r.strengths_text ? `<p><strong>Strengths:</strong> ${escapeHtml(r.strengths_text)}</p>` : ''}
                ${r.cautions_text ? `<p><strong>Cautions:</strong> ${escapeHtml(r.cautions_text)}</p>` : ''}
                ${r.fit_text ? `<p><strong>Fit:</strong> ${escapeHtml(r.fit_text)}</p>` : ''}
              </div>
            `).join('')}
          </div>
          ${(reviews || []).length === 0 ? `<p class="hint">${escapeHtml(t('noComments').replace('讨论', '评价'))}</p>` : ''}
        </section>

        <details class="profile-side-panel" style="cursor:pointer">
          <summary><strong>${escapeHtml(t('recentPapers'))} (${fmt(paperCount)})</strong></summary>
          <div style="margin-top:8px">${profilePapers(profile.papers)}</div>
        </details>
      </section>
    `;
    bindProfileLinks();
    $('writeReviewBtn')?.addEventListener('click', () => {
      const reviewPanel = $('reviewPanel');
      if (reviewPanel) {
        reviewPanel.open = true;
        reviewPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  } catch (err) {
    $('results').innerHTML = `<div class="empty">Failed to load mentor: ${escapeHtml(err.message)}</div>`;
  }
  // Render write-review form in right rail
  const box = $('reviewBox');
  if (!box) return;
  try {
    const relationshipTypes = ['Former Student', 'Current Student', 'Collaborator', 'External Reviewer'];
    box.innerHTML = `
      <div class="review-form" style="border-top:none;padding-top:0">
        <h4 style="margin-bottom:10px;color:var(--accent)">📝 ${escapeHtml(t('writeReview'))}</h4>
        <label class="field">
          <span>${escapeHtml(t('reviewAlias'))}</span>
          <input id="reviewAlias" type="text" placeholder="Verified Reviewer" value="Verified Reviewer">
        </label>
        <label class="field">
          <span>${escapeHtml(t('reviewRelationship'))}</span>
          <select id="reviewRelationship">
            ${relationshipTypes.map(type => `<option>${escapeHtml(type)}</option>`).join('')}
          </select>
        </label>
        <label class="field wide">
          <span>${escapeHtml(t('reviewStrengths'))}</span>
          <textarea id="reviewStrengths" placeholder="导师的学术优势、指导风格亮点、资源支持等..."></textarea>
        </label>
        <label class="field wide">
          <span>${escapeHtml(t('reviewCautions'))}</span>
          <textarea id="reviewCautions" placeholder="可能需要注意的地方，如指导频率、性格特点、毕业要求等..."></textarea>
        </label>
        <label class="field wide">
          <span>${escapeHtml(t('reviewFit'))}</span>
          <textarea id="reviewFit" placeholder="适合什么样的学生？例如：自主性强的学生、需要手把手指导的学生、偏工程还是偏理论..."></textarea>
        </label>
        <button class="button primary" id="submitReview" type="button">${escapeHtml(t('submitReview'))}</button>
        <p class="hint">${escapeHtml(t('mentorDisclaimer'))}</p>
      </div>
    `;
    $('submitReview')?.addEventListener('click', async () => {
      const publicAlias = $('reviewAlias').value.trim() || 'Verified Reviewer';
      const relationshipType = $('reviewRelationship').value;
      const strengthsText = $('reviewStrengths').value.trim();
      const cautionsText = $('reviewCautions').value.trim();
      const fitText = $('reviewFit').value.trim();
      if (!strengthsText && !cautionsText && !fitText) return;
      await api(`/api/authors/${encodeURIComponent(name)}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ publicAlias, relationshipType, strengthsText, cautionsText, fitText, scores: {} })
      });
      await loadMentorProfile(name);
    });
  } catch (err) {
    box.innerHTML = `<p class="hint">Review form failed: ${escapeHtml(err.message)}</p>`;
  }
}

function mentorText(zh, en) {
  return state.language === 'zh' ? zh : en;
}

function mentorReviewsEmptyText() {
  return state.language === 'zh' ? '暂无导师评价。' : 'No mentor reviews yet.';
}

function mentorInstitutionMatches(inst, query) {
  const matchesQuery = !query || [
    inst.name,
    inst.qs?.name,
    inst.qs?.region,
    inst.qs?.qs_world_rank ? `qs ${inst.qs.qs_world_rank}` : ''
  ].join(' ').toLowerCase().includes(query);
  const matchesRegion = !state.mentorInstitutionRegion || (inst.qs?.region || 'Unknown') === state.mentorInstitutionRegion;
  const matchesPapers = Number(inst.papers || 0) >= Number(state.mentorInstitutionMinPapers || 0);
  const matchesQs = !state.mentorInstitutionQsOnly || Boolean(inst.qs?.qs_world_rank);
  return matchesQuery && matchesRegion && matchesPapers && matchesQs;
}

function mentorInstitutionRegions(institutions) {
  return [...new Set(institutions.map(inst => inst.qs?.region || 'Unknown'))]
    .sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return a.localeCompare(b);
    });
}

function scrollMentorPageTop(options = {}) {
  if (options.preserveScroll) return;
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
}

function scrollPageTop(options = {}) {
  if (options.preserveScroll) return;
  window.scrollTo({ top: 0, left: 0 });
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
}

function exitPaperDetailMode() {
  document.body.classList.remove('paper-detail-active');
  document.documentElement.style.removeProperty('--detail-rail-top');
}

function renderProfileLoading(label, detailLabel = label) {
  exitPaperDetailMode();
  $('summary').innerHTML = '';
  $('pagination').innerHTML = '';
  $('results').classList.remove('compact');
  $('results').innerHTML = `<div class="loading">${escapeHtml(label)}</div>`;
  $('detail').innerHTML = `<div class="loading">${escapeHtml(detailLabel)}</div>`;
}

function mentorRecentQuery() {
  return state.mentorRecentOnly ? '?recentYears=8' : '';
}

function mentorScopeLabel() {
  return state.mentorRecentOnly ? mentorText('近8年', 'Recent 8 years') : mentorText('全部年份', 'All years');
}

function bindMentorRecentToggle(onChange) {
  $('mentorRecentOnly')?.addEventListener('change', event => {
    state.mentorRecentOnly = event.target.checked;
    localStorage.setItem('icSeekerMentorRecentOnly', state.mentorRecentOnly ? '1' : '0');
    state.mentorInstitutionCache = new Map();
    state.mentorInstitutionLimit = 80;
    onChange();
  });
}

async function renderMentorInstitutions(options = {}) {
  state.currentView = 'mentor-institutions';
  document.body.classList.add('mentor-section');
  if (options.history !== 'skip') writeRoute({ view: 'mentor-institutions' }, options.history || 'push');
  state.detailCollapsed = true;
  applyDetailState();
  $('summary').innerHTML = '';
  $('pagination').innerHTML = '';
  $('results').classList.remove('compact');
  $('results').innerHTML = '<div class="loading">Loading institutions...</div>';
  $('detail').innerHTML = `
    <div class="empty detail-empty">
      <strong>${escapeHtml(t('selectInstitution'))}</strong>
    </div>`;
  const reviewBox = $('reviewBox');
  if (reviewBox) reviewBox.innerHTML = `<p class="hint">${escapeHtml(t('selectMentor'))}</p>`;

  try {
    const cacheKey = state.mentorRecentOnly ? 'recent8' : 'all';
    if (!state.mentorInstitutionCache.has(cacheKey)) {
      state.mentorInstitutionCache.set(cacheKey, await api(`/api/mentor/institutions${mentorRecentQuery()}`));
    }
    const institutions = state.mentorInstitutionCache.get(cacheKey);
    const query = String(state.mentorInstitutionQuery || '').trim().toLowerCase();
    const regions = mentorInstitutionRegions(institutions);
    const filtered = institutions.filter(inst => mentorInstitutionMatches(inst, query));
    const visible = filtered.slice(0, state.mentorInstitutionLimit);

    $('results').innerHTML = `
      <section class="mentor-institutions-page">
        <div class="ranking-head mentor-index-head">
          <div>
            <p class="profile-kicker">${escapeHtml(mentorText('导师与机构', 'Mentors and Institutions'))}</p>
            <h2>${escapeHtml(mentorText('IC 导师机构索引', 'IC Mentor Institution Index'))}</h2>
            <p>${escapeHtml(mentorText('按 IC 学术实力排序，支持地区、论文规模和 QS 覆盖筛选。首屏只渲染部分卡片，避免大库加载时卡住。', 'Sorted by IC research strength, with region, paper-volume, and QS coverage filters.'))}</p>
          </div>
        </div>
        <div class="mentor-index-toolbar">
          <label class="mentor-index-search">
            <span>${escapeHtml(mentorText('搜索机构', 'Search institution'))}</span>
            <input id="mentorInstitutionSearch" type="search" value="${escapeHtml(state.mentorInstitutionQuery)}" placeholder="MIT, Tsinghua, HKUST...">
          </label>
          <label class="mentor-index-filter">
            <span>${escapeHtml(mentorText('地区', 'Region'))}</span>
            <select id="mentorInstitutionRegion">
              <option value="">${escapeHtml(mentorText('全部地区', 'All regions'))}</option>
              ${regions.map(region => `<option value="${escapeHtml(region)}" ${region === state.mentorInstitutionRegion ? 'selected' : ''}>${escapeHtml(region)}</option>`).join('')}
            </select>
          </label>
          <label class="mentor-index-filter">
            <span>${escapeHtml(mentorText('最少论文', 'Min papers'))}</span>
            <select id="mentorInstitutionMinPapers">
              ${[2, 5, 10, 20, 50, 100].map(value => `<option value="${value}" ${Number(state.mentorInstitutionMinPapers) === value ? 'selected' : ''}>${value}+</option>`).join('')}
            </select>
          </label>
          <label class="mentor-index-check">
            <input id="mentorInstitutionQsOnly" type="checkbox" ${state.mentorInstitutionQsOnly ? 'checked' : ''}>
            <span>${escapeHtml(mentorText('仅 QS 覆盖', 'QS only'))}</span>
          </label>
          <label class="mentor-index-check">
            <input id="mentorRecentOnly" type="checkbox" ${state.mentorRecentOnly ? 'checked' : ''}>
            <span>${escapeHtml(mentorText('近8年', 'Recent 8 years'))}</span>
          </label>
          <span class="pill">${escapeHtml(mentorScopeLabel())}</span>
          <div class="mentor-index-count">${escapeHtml(mentorText(
            `显示 ${fmt(visible.length)} / ${fmt(filtered.length)} 个机构，共 ${fmt(institutions.length)} 个`,
            `Showing ${fmt(visible.length)} / ${fmt(filtered.length)} of ${fmt(institutions.length)}`
          ))}</div>
        </div>
        <div class="institution-grid">
          ${visible.map(renderMentorInstitutionCard).join('') || `<div class="empty">${escapeHtml(mentorText('没有匹配的机构。', 'No institutions matched.'))}</div>`}
        </div>
        <div class="mentor-index-actions">
          ${filtered.length > visible.length ? `<button class="button" id="loadMoreMentorInstitutions" type="button">${escapeHtml(mentorText('再显示 80 个', 'Show 80 more'))}</button>` : ''}
        </div>
      </section>
    `;

    $('mentorInstitutionSearch')?.addEventListener('input', event => {
      state.mentorInstitutionQuery = event.target.value;
      state.mentorInstitutionLimit = 80;
      renderMentorInstitutions({ history: 'skip' });
    });
    $('mentorInstitutionRegion')?.addEventListener('change', event => {
      state.mentorInstitutionRegion = event.target.value;
      state.mentorInstitutionLimit = 80;
      renderMentorInstitutions({ history: 'skip' });
    });
    $('mentorInstitutionMinPapers')?.addEventListener('change', event => {
      state.mentorInstitutionMinPapers = Number(event.target.value || 2);
      state.mentorInstitutionLimit = 80;
      renderMentorInstitutions({ history: 'skip' });
    });
    $('mentorInstitutionQsOnly')?.addEventListener('change', event => {
      state.mentorInstitutionQsOnly = event.target.checked;
      state.mentorInstitutionLimit = 80;
      renderMentorInstitutions({ history: 'skip' });
    });
    bindMentorRecentToggle(() => renderMentorInstitutions({ history: 'skip' }));
    $('loadMoreMentorInstitutions')?.addEventListener('click', () => {
      state.mentorInstitutionLimit += 80;
      renderMentorInstitutions({ history: 'skip', preserveScroll: true });
    });
    document.querySelectorAll('[data-institution]').forEach(el => {
      el.addEventListener('click', () => renderMentorByInstitution(el.dataset.institution));
    });
    scrollMentorPageTop(options);
  } catch (err) {
    $('results').innerHTML = `<div class="empty">Failed to load institutions: ${escapeHtml(err.message)}</div>`;
  }
}

function renderMentorInstitutionCard(inst) {
  return `
    <button class="institution-card" type="button" data-institution="${escapeHtml(inst.name)}">
      <div class="institution-card-header">
        <span class="institution-name">${escapeHtml(inst.name)}</span>
        ${inst.qs ? `<span class="qs-badge" title="QS World ${inst.qs.qs_world_rank}">QS ${inst.qs.qs_world_rank}</span>` : ''}
      </div>
      <div class="institution-card-body">
        <div class="metric"><span>${escapeHtml(t('institutionMentors'))}</span><strong>${fmt(inst.mentorCount)}</strong></div>
        <div class="metric"><span>${escapeHtml(t('institutionPapers'))}</span><strong>${fmt(inst.papers)}</strong></div>
        <div class="metric"><span>${escapeHtml(t('mentorScore'))}</span><strong>${escapeHtml(inst.institutionScore)}</strong></div>
        ${inst.qs ? `<div class="metric"><span>${escapeHtml(t('institutionRegionRank'))}</span><strong>${escapeHtml(inst.qs.region)} ${inst.qs.qs_region_rank}</strong></div>` : ''}
      </div>
      <div class="institution-card-footer">
        <span>S+ ${fmt(inst.sPlus)}</span> · <span>S ${fmt(inst.s)}</span> · <span>A ${fmt(inst.a)}</span>
      </div>
    </button>
  `;
}

function mentorTrendLabel(trend) {
  if (trend === 'rising') return mentorText('近年上升', 'Rising');
  if (trend === 'cooling') return mentorText('近年放缓', 'Cooling');
  return mentorText('稳定活跃', 'Stable');
}

function mentorRoleLabel(stage) {
  if (stage === 'senior-or-leading-faculty') return mentorText('资深导师候选', 'Senior faculty candidate');
  if (stage === 'faculty-candidate') return mentorText('导师候选', 'Faculty candidate');
  return mentorText('可能学生/合作者', 'Likely student/collaborator');
}

async function renderMentorByInstitution(name, options = {}) {
  if (!name) return;
  state.currentView = 'mentor-institution';
  document.body.classList.add('mentor-section');
  if (options.history !== 'skip') writeRoute({ view: 'mentor-institution', name }, options.history || 'push');
  state.detailCollapsed = true;
  applyDetailState();
  $('summary').innerHTML = '';
  $('pagination').innerHTML = '';
  $('results').classList.remove('compact');
  $('results').innerHTML = '<div class="loading">Loading mentors...</div>';
  $('detail').innerHTML = `
    <div class="empty detail-empty">
      <strong>${escapeHtml(t('selectMentor'))}</strong>
    </div>`;

  try {
    const data = await api(`/api/mentor/institutions/${encodeURIComponent(name)}${mentorRecentQuery()}`);
    const ambiguousMentorNote = mentorText(
      '这个名称更像二级院系/研究中心，不是唯一学校实体。当前先隐藏导师候选，下面列出可能的上级机构；后续接入 IEEE 作者-单位映射后再精确归并。',
      'This looks like a subunit rather than a unique institution entity. Mentor candidates are hidden for now; possible parent institutions are listed below until author-affiliation mapping is connected.'
    );
    $('results').innerHTML = `
      <section class="mentor-list-page">
        <div class="ranking-head mentor-index-head">
          <div>
            <p class="profile-kicker">${escapeHtml(mentorText('机构导师', 'Institution mentors'))}</p>
            <h2>${escapeHtml(data.institution)}</h2>
            <div class="institution-qs-bar">
              ${data.qs ? `
                <span class="qs-badge large">QS World ${escapeHtml(data.qs.qs_world_rank)}</span>
                <span class="qs-badge">${escapeHtml(data.qs.region)} ${escapeHtml(data.qs.qs_region_rank)}</span>
              ` : '<span class="qs-badge">QS N/A</span>'}
              <span class="pill">${fmt(data.mentorCandidateCount ?? data.mentors.length)} ${escapeHtml(mentorText('导师候选', 'mentor candidates'))}</span>
              <span class="pill">${escapeHtml(mentorText('已过滤可能学生作者', 'filtered likely students'))} ${fmt(data.excludedLikelyStudentCount || 0)}</span>
            </div>
          </div>
          <label class="mentor-index-check inline">
            <input id="mentorRecentOnly" type="checkbox" ${state.mentorRecentOnly ? 'checked' : ''}>
            <span>${escapeHtml(mentorText('近8年', 'Recent 8 years'))}</span>
          </label>
          <button class="button" id="backToInstitutions" type="button">${escapeHtml(t('backToInstitutions'))}</button>
        </div>
        <div class="topic-subcategory-bar">
          ${data.domains.slice(0, 10).map(d => `<span class="chip">${escapeHtml(d.key)} (${fmt(d.count)})</span>`).join('')}
        </div>
        ${data.ambiguousSubunit ? `<section class="profile-side-panel ambiguous-node">
          <h3>${escapeHtml(mentorText('需要归并的二级机构', 'Subunit needs merging'))}</h3>
          <p class="hint">${escapeHtml(ambiguousMentorNote)}</p>
          <div class="link-cloud">${tokenLinks((data.parentInstitutions || []).map(x => x.key).join('; '), 'institution')}</div>
        </section>` : ''}
        <div class="ranking-list">
          ${data.mentors.map((m, index) => `
            <button class="ranking-card mentor-ranking-card" type="button" data-mentor="${escapeHtml(m.name)}">
              <span class="rank-no">${index + 1}</span>
              <span class="rank-avatar">${escapeHtml(initials(m.name))}</span>
              <span class="rank-body">
                <strong>${escapeHtml(m.name)}</strong>
                <em>${escapeHtml(mentorRoleLabel(m.roleStage))} · ${fmt(m.papers)} ${escapeHtml(t('mentorPapers'))} · S+ ${fmt(m.sPlus)} · Score ${escapeHtml(m.authorScore)} · ${escapeHtml(mentorTrendLabel(m.trend))} · ${escapeHtml(mentorText('近五年', 'recent'))} ${fmt(m.recentPapers || 0)}</em>
                <em>${escapeHtml(mentorText('推断单位', 'Inferred affiliation'))}: ${escapeHtml(m.primaryInstitution || data.institution)} · ${escapeHtml(mentorText('本机构论文', 'institution papers'))} ${fmt(m.institutionPapers || m.papers)} · ${Math.round(Number(m.institutionShare || 0) * 100)}%</em>
                <span class="mentor-domain-strip">
                  ${(m.topDomains || []).map(d => `<span>${escapeHtml(d.key)} · ${fmt(d.count)}</span>`).join('')}
                </span>
              </span>
              <span class="rank-score">${escapeHtml(m.authorScore)}</span>
            </button>
          `).join('') || `<div class="empty">${escapeHtml(mentorText('这个机构暂时没有可显示的导师。', 'No mentors are available for this institution.'))}</div>`}
        </div>
      </section>
    `;
    bindMentorRecentToggle(() => renderMentorByInstitution(name, { history: 'skip' }));
    $('backToInstitutions')?.addEventListener('click', () => renderMentorInstitutions());
    document.querySelectorAll('[data-institution-link]').forEach(el => {
      el.addEventListener('click', () => renderMentorByInstitution(el.dataset.institutionLink));
    });
    document.querySelectorAll('[data-mentor]').forEach(el => {
      el.addEventListener('click', () => loadMentorProfile(el.dataset.mentor));
    });
    scrollMentorPageTop(options);
  } catch (err) {
    $('results').innerHTML = `<div class="empty">Failed to load mentors: ${escapeHtml(err.message)}</div>`;
  }
}

async function loadMentorProfile(name, options = {}) {
  if (!name) return;
  state.currentView = 'mentor-profile';
  document.body.classList.add('mentor-section');
  if (options.history !== 'skip') writeRoute({ view: 'mentor-profile', name }, options.history || 'push');
  state.detailCollapsed = false;
  applyDetailState();
  scrollMentorPageTop(options);
  renderProfileLoading(`Loading mentor profile: ${name}...`, 'Preparing mentor reviews...');

  try {
    const profile = await api(`/api/mentor/authors/${encodeURIComponent(name)}${mentorRecentQuery()}`);
    const paperCount = profile.paperCount ?? (Array.isArray(profile.papers) ? profile.papers.length : 0);
    const strength = yearlySeriesFromPapers(profile.papers, 'score');
    const activity = yearlySeriesFromPapers(profile.papers, 'count');
    const domains = profile.byDomain?.slice(0, 8) || [];
    const reviews = profile.reviews || [];
    const reviewStats = profile.reviewStats || {};
    const threshold = (reviewStats.total || 0) < 3 ? 'insufficient' : (reviewStats.total || 0) < 5 ? 'broad' : 'full';

    $('results').innerHTML = `
      <section class="scholar-profile mentor-profile-page">
        <div class="profile-hero compact-profile-hero">
          ${renderPhotoPlaceholder()}
          <div class="profile-main">
            <p class="profile-kicker">${escapeHtml(t('profileSummary'))}</p>
            <h2>${escapeHtml(profile.name)}</h2>
            <div class="profile-tags">
              <span>${fmt(paperCount)} ${escapeHtml(t('summaryPapers'))}</span>
              <span>${escapeHtml(t('sortScore'))} ${escapeHtml(profile.authorScore)}</span>
              ${profile.primaryInstitution ? `<span>${escapeHtml(profile.primaryInstitution)}</span>` : ''}
              ${profile.qs ? `<span class="qs-badge">${escapeHtml(profile.qs?.name || profile.primaryInstitution)} QS ${escapeHtml(profile.qs?.qs_world_rank || 'N/A')}</span>` : ''}
            </div>
            <div class="actions">
              <a class="primary" target="_blank" href="${escapeHtml(profile.external.googleScholar)}">Scholar</a>
              <a target="_blank" href="${escapeHtml(profile.external.webSearch)}">Web search</a>
              <button class="button primary" id="writeReviewBtn" type="button">${escapeHtml(t('writeReview'))}</button>
            </div>
          </div>
        </div>
        <div class="profile-domain-bar">
          ${domains.map(d => `<span class="chip">${escapeHtml(d.key)} (${fmt(d.count)})</span>`).join('')}
        </div>
        ${renderProfileSummary(profile, paperCount)}
        <div class="mentor-profile-grid">
          ${renderSparkBars(strength, t('careerStrength'), 'line')}
          ${renderSparkBars(activity, t('yearlyActivity'), 'bar')}
          <section class="profile-side-panel">
            <h3>${escapeHtml(t('rankDistribution'))}</h3>
            ${renderRankDonut(profile.ranks)}
          </section>
          <section class="profile-side-panel">
            <h3>${escapeHtml(t('collaboratorNetwork'))}</h3>
            ${renderClickableMiniBars(profile.coauthors.slice(0, 16), 'papers', 'author')}
          </section>
        </div>
        <section class="profile-side-panel">
          <h3>${escapeHtml(t('institutionHistory'))}</h3>
          <div class="link-cloud">${tokenLinks(profile.institutions.map(x => x.key).join('; '), 'institution')}</div>
        </section>
        <section class="profile-side-panel mentor-review-panel">
          <h3>${escapeHtml(t('mentorReviews'))}</h3>
          <div class="review-stats">
            <div class="metric"><span>Reviews</span><strong>${fmt(reviewStats.total || 0)}</strong></div>
            <div class="metric"><span>Verified</span><strong>${fmt(reviewStats.verified || 0)}</strong></div>
          </div>
          ${threshold === 'insufficient' ? `<p class="hint">${escapeHtml(t('insufficientData'))}</p>` : ''}
          ${threshold === 'broad' ? `<p class="hint">${escapeHtml(t('broadDistribution'))}</p>` : ''}
          <div class="review-list">
            ${reviews.map(renderMentorReview).join('') || `<p class="hint">${escapeHtml(mentorReviewsEmptyText())}</p>`}
          </div>
        </section>
        <details class="profile-side-panel" open>
          <summary><strong>${escapeHtml(t('recentPapers'))} (${fmt(paperCount)})</strong></summary>
          <div style="margin-top:8px">${profilePapers(profile.papers)}</div>
        </details>
      </section>
    `;
    $('detail').innerHTML = `
      <section class="author-profile-detail">
        <div class="profile-hero compact-profile-hero">
          ${renderPhotoPlaceholder()}
          <div class="profile-main">
            <p class="profile-kicker">${escapeHtml(t('profileSummary'))}</p>
            <h2>${escapeHtml(profile.name)}</h2>
            <div class="profile-tags">
              <span>${fmt(paperCount)} ${escapeHtml(t('summaryPapers'))}</span>
              <span>${escapeHtml(t('sortScore'))} ${escapeHtml(profile.authorScore)}</span>
              ${profile.primaryInstitution ? `<span>${escapeHtml(profile.primaryInstitution)}</span>` : ''}
              ${profile.qs ? `<span class="qs-badge">${escapeHtml(profile.qs?.name || profile.primaryInstitution)} QS ${escapeHtml(profile.qs?.qs_world_rank || 'N/A')}</span>` : ''}
            </div>
          </div>
        </div>
        ${renderProfileSummary(profile, paperCount)}
        <section class="profile-side-panel">
          <h3>${escapeHtml(t('mentorReviews'))}</h3>
          <div class="review-stats">
            <div class="metric"><span>Reviews</span><strong>${fmt(reviewStats.total || 0)}</strong></div>
            <div class="metric"><span>Verified</span><strong>${fmt(reviewStats.verified || 0)}</strong></div>
          </div>
          <p class="hint">${escapeHtml(t('mentorDisclaimer'))}</p>
        </section>
      </section>
    `;
    bindProfileLinks();
    renderMentorReviewForm(name);
    $('writeReviewBtn')?.addEventListener('click', () => {
      const reviewPanel = $('reviewPanel');
      if (reviewPanel) {
        reviewPanel.open = true;
        reviewPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    scrollMentorPageTop(options);
  } catch (err) {
    $('results').innerHTML = `<div class="empty">Failed to load mentor: ${escapeHtml(err.message)}</div>`;
  }
}

function renderMentorReview(review) {
  return `
    <div class="review-item">
      <div class="review-meta">
        <strong>${escapeHtml(review.public_alias || 'Reviewer')}</strong>
        <span class="pill">${escapeHtml(review.relationship_type || 'Reviewer')}</span>
        <em>${escapeHtml(review.created_at?.slice(0, 10) || '')}</em>
      </div>
      ${review.strengths_text ? `<p><strong>Strengths:</strong> ${escapeHtml(review.strengths_text)}</p>` : ''}
      ${review.cautions_text ? `<p><strong>Cautions:</strong> ${escapeHtml(review.cautions_text)}</p>` : ''}
      ${review.fit_text ? `<p><strong>Fit:</strong> ${escapeHtml(review.fit_text)}</p>` : ''}
    </div>
  `;
}

function renderMentorReviewForm(name) {
  const box = $('reviewBox');
  if (!box) return;
  const relationshipTypes = ['Former Student', 'Current Student', 'Collaborator', 'External Reviewer'];
  box.innerHTML = `
    <div class="review-form" style="border-top:none;padding-top:0">
      <h4 style="margin-bottom:10px;color:var(--accent)">${escapeHtml(t('writeReview'))}</h4>
      <label class="field">
        <span>${escapeHtml(t('reviewAlias'))}</span>
        <input id="reviewAlias" type="text" placeholder="Verified Reviewer" value="Verified Reviewer">
      </label>
      <label class="field">
        <span>${escapeHtml(t('reviewRelationship'))}</span>
        <select id="reviewRelationship">
          ${relationshipTypes.map(type => `<option>${escapeHtml(type)}</option>`).join('')}
        </select>
      </label>
      <label class="field wide">
        <span>${escapeHtml(t('reviewStrengths'))}</span>
        <textarea id="reviewStrengths" placeholder="${escapeHtml(mentorText('导师的学术优势、指导风格亮点、资源支持等...', 'Academic strengths, advising style, resources...'))}"></textarea>
      </label>
      <label class="field wide">
        <span>${escapeHtml(t('reviewCautions'))}</span>
        <textarea id="reviewCautions" placeholder="${escapeHtml(mentorText('需要注意的地方，例如指导频率、毕业要求、沟通风格等...', 'Cautions such as advising frequency, graduation expectations, communication style...'))}"></textarea>
      </label>
      <label class="field wide">
        <span>${escapeHtml(t('reviewFit'))}</span>
        <textarea id="reviewFit" placeholder="${escapeHtml(mentorText('适合什么样的学生？', 'What kind of student is a good fit?'))}"></textarea>
      </label>
      <button class="button primary" id="submitReview" type="button">${escapeHtml(t('submitReview'))}</button>
      <p class="hint">${escapeHtml(t('mentorDisclaimer'))}</p>
    </div>
  `;
  $('submitReview')?.addEventListener('click', async () => {
    const publicAlias = $('reviewAlias').value.trim() || 'Verified Reviewer';
    const relationshipType = $('reviewRelationship').value;
    const strengthsText = $('reviewStrengths').value.trim();
    const cautionsText = $('reviewCautions').value.trim();
    const fitText = $('reviewFit').value.trim();
    if (!strengthsText && !cautionsText && !fitText) return;
    await api(`/api/authors/${encodeURIComponent(name)}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ publicAlias, relationshipType, strengthsText, cautionsText, fitText, scores: {} })
    });
    await loadMentorProfile(name, { history: 'skip' });
  });
}


async function renderVenueMatrix(options = {}) {
  if (options.history !== 'skip') writeRoute({ view: 'venueMatrix' });
  state.currentView = 'venueMatrix';
  state.detailCollapsed = true;
  applyDetailState();
  $('summary').innerHTML = '';
  $('pagination').innerHTML = '';
  $('results').classList.remove('compact');
  $('results').innerHTML = '<div class="loading">Loading venue matrix...</div>';
  try {
    const data = await api('/api/venue-matrix');
    const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019];
    const totalAll = data.reduce((sum, v) => sum + v.total, 0);
    $('results').innerHTML = `
      <section class="venue-matrix-page">
        <div class="venue-matrix-header">
          <h2>${escapeHtml(t('venueMatrixTitle'))}</h2>
          <p>${escapeHtml(t('venueMatrixSubtitle'))} · ${fmt(data.length)} venues · ${fmt(totalAll)} papers</p>
        </div>
        <div class="venue-matrix-table-wrap">
          <table class="venue-matrix-table">
            <thead>
              <tr>
                <th class="col-venue">${escapeHtml(t('venueMatrixVenue'))}</th>
                <th class="col-tier">${escapeHtml(t('venueMatrixTier'))}</th>
                <th class="col-domain">${escapeHtml(t('venueMatrixDomain'))}</th>
                ${years.map(y => `<th class="col-year">${y}</th>`).join('')}
                <th class="col-earlier">${escapeHtml(t('venueMatrixEarlier'))}</th>
                <th class="col-total">${escapeHtml(t('venueMatrixTotal'))}</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(venue => `
                <tr class="venue-row" data-venue="${escapeHtml(venue.name)}">
                  <td class="col-venue">
                    <button class="venue-link" type="button" data-venue-search="${escapeHtml(venue.name)}">
                      ${escapeHtml(venue.name)}
                    </button>
                  </td>
                  <td class="col-tier">
                    <span class="tier-badge tier-${rankToClass(venue.rank)}">${escapeHtml(venue.rank)}</span>
                  </td>
                  <td class="col-domain">
                    <div class="domain-tags">
                      ${venue.allDomains.slice(0, 3).map(d => `<span class="domain-chip">${escapeHtml(d)}</span>`).join('')}
                    </div>
                  </td>
                  ${years.map(y => {
                    const count = venue.yearCounts[y] || 0;
                    return `<td class="col-year ${count ? 'has-count' : 'no-count'}">
                      ${count ? `<button class="year-count" type="button" data-venue-year="${escapeHtml(venue.name)}" data-year="${y}">${fmt(count)}</button>` : '-'}
                    </td>`;
                  }).join('')}
                  <td class="col-earlier ${venue.earlier ? 'has-count' : 'no-count'}">
                    ${venue.earlier ? `<button class="year-count" type="button" data-venue-year="${escapeHtml(venue.name)}" data-year="earlier">${fmt(venue.earlier)}</button>` : '-'}
                  </td>
                  <td class="col-total"><strong>${fmt(venue.total)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;
    document.querySelectorAll('[data-venue-search]').forEach(el => {
      el.addEventListener('click', () => {
        $('venue').value = el.dataset.venueSearch;
        searchFirstPage({ history: 'push' });
      });
    });
    document.querySelectorAll('[data-venue-year]').forEach(el => {
      el.addEventListener('click', () => {
        const venue = el.dataset.venueYear;
        const year = el.dataset.year;
        $('venue').value = venue;
        if (year !== 'earlier') {
          $('yearFrom').value = year;
          $('yearTo').value = year;
        } else {
          $('yearFrom').value = '2000';
          $('yearTo').value = '2018';
        }
        searchFirstPage({ history: 'push' });
      });
    });
  } catch (err) {
    $('results').innerHTML = `<div class="empty">Failed to load venue matrix: ${escapeHtml(err.message)}</div>`;
  }
}
