import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Language = 'zh' | 'en'

const STORAGE_KEY = 'siliconscope.language.v1'

const messages = {
  zh: {
    'nav.section.product': 'SiliconScope',
    'nav.search': '学术搜索',
    'nav.intelligence': '情报中心',
    'nav.learning': '学习路线',
    'nav.workspace': '个人工作台',
    'nav.account': '账户平台',
    'nav.theme': '主题',
    'nav.theme.system': '跟随系统',
    'nav.theme.light': '浅色',
    'nav.theme.dark': '深色',
    'nav.collapse': '收起',
    'nav.workspaceHint': 'SQLite metadata workspace',
    'nav.language': '语言',
    'nav.toggle': '切换导航',
    'loading.enter': '正在进入 SiliconScope',
    'loading.authCheck': '检查本地认证状态和工作台配置。',
    'loading.home': '检查登录状态并准备首页。',
    'loading.page': '正在加载页面',
    'loading.module': '模块正在按需加载。',
    'login.help': '请输入管理员密码进入本地 IC 论文情报工作台。',
    'login.error': '登录失败，请检查 ADMIN_PASSWORD',
    'login.loading': '登录中...',
    'login.submit': '登录',
    'login.requestAccess': '申请私测访问',
    'common.backToSearch': '返回搜索',
    'common.loading': '加载中...',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.saved': '已保存',
    'common.favorite': '收藏',
    'common.favorited': '已收藏',
    'common.unfavorite': '取消收藏',
    'common.openDoi': '打开 DOI',
    'common.openPdf': '打开 PDF',
    'common.source': '来源',
    'common.noAbstract': '暂无摘要。',
    'common.noComments': '暂无评论。',
    'common.comments': '评论',
    'common.report': '举报',
    'common.reported': '已举报',
    'common.submit': '提交',
    'paper.detail': '论文详情',
    'paper.abstract': '摘要',
    'paper.translation': 'AI 摘要翻译',
    'paper.translate': '翻译摘要',
    'paper.translateCached': '已使用缓存翻译',
    'paper.translateFresh': '已生成并缓存翻译',
    'paper.translateError': '翻译摘要失败',
    'paper.discussion': '论文讨论',
    'paper.metadata': 'Metadata',
    'paper.institution': '机构',
    'paper.author': '作者',
    'paper.collectionSource': '采集来源',
    'paper.pdfStatus': 'PDF 状态',
    'paper.verificationStatus': '验证状态',
    'paper.readingNotes': '阅读与笔记',
    'paper.status': '状态',
    'paper.tags': '标签',
    'paper.privateNote': '私人笔记',
    'paper.saveReading': '保存阅读状态',
    'paper.readingQueue': '阅读队列',
    'paper.quickQueueHint': '快速标记到阅读队列，不影响收藏和笔记。',
    'paper.commentHint': '讨论论文方法、电路、实验和可复现性。不要攻击作者个人，也不要上传或分享受版权保护的 PDF。',
    'paper.commentPlaceholder': '评论论文内容；不攻击作者个人；不要上传或分享 PDF。',
    'paper.commentSubmitted': '评论已提交，敏感内容会进入审核。',
    'paper.commentsLoading': '评论加载中',
    'paper.commentsPublicOnly': '只展示已经通过审核的公开评论。',
    'paper.commentsEmptyHint': '适合记录技术问题、复现笔记和相关工作补充。',
    'paper.loadMoreComments': '加载更多评论',
    'paper.detailLoadFailed': '论文详情加载失败',
    'paper.detailLoading': '正在加载论文详情',
    'paper.detailLoadingDesc': '整理 DOI、作者、摘要、阅读状态和评论。',
    'paper.copiedCitation': '已复制 {format}',
    'paper.queueUpdated': '阅读状态已更新',
    'paper.reportSubmitted': '已举报',
    'paper.reportFailed': '举报失败',
    'paper.reading.unread': '未读',
    'paper.reading.reading': '在读',
    'paper.reading.read': '已读',
    'paper.reading.important': '重点',
    'paper.reading.skip': '跳过',
    'paper.reading.review_later': '稍后复习',
    'paper.reading.use_for_literature_review': '用于文献综述',
    'paper.reading.use_for_application': '用于申请',
    'paper.reading.use_for_project': '用于项目',
  },
  en: {
    'nav.section.product': 'SiliconScope',
    'nav.search': 'Academic Search',
    'nav.intelligence': 'Intelligence Hub',
    'nav.learning': 'Learning Routes',
    'nav.workspace': 'Workspace',
    'nav.account': 'Account',
    'nav.theme': 'Theme',
    'nav.theme.system': 'System',
    'nav.theme.light': 'Light',
    'nav.theme.dark': 'Dark',
    'nav.collapse': 'Collapse',
    'nav.workspaceHint': 'SQLite metadata workspace',
    'nav.language': 'Language',
    'nav.toggle': 'Toggle navigation',
    'loading.enter': 'Entering SiliconScope',
    'loading.authCheck': 'Checking local authentication and workspace settings.',
    'loading.home': 'Checking login status and preparing the home page.',
    'loading.page': 'Loading page',
    'loading.module': 'Loading module on demand.',
    'login.help': 'Enter the admin password to open the local IC paper intelligence workspace.',
    'login.error': 'Login failed. Check ADMIN_PASSWORD.',
    'login.loading': 'Logging in...',
    'login.submit': 'Log in',
    'login.requestAccess': 'Request private access',
    'common.backToSearch': 'Back to search',
    'common.loading': 'Loading...',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.saved': 'Saved',
    'common.favorite': 'Save',
    'common.favorited': 'Saved',
    'common.unfavorite': 'Unsave',
    'common.openDoi': 'Open DOI',
    'common.openPdf': 'Open PDF',
    'common.source': 'Source',
    'common.noAbstract': 'No abstract yet.',
    'common.noComments': 'No comments yet.',
    'common.comments': 'comments',
    'common.report': 'Report',
    'common.reported': 'Reported',
    'common.submit': 'Submit',
    'paper.detail': 'Paper detail',
    'paper.abstract': 'Abstract',
    'paper.translation': 'AI abstract translation',
    'paper.translate': 'Translate abstract',
    'paper.translateCached': 'Used cached translation',
    'paper.translateFresh': 'Generated and cached translation',
    'paper.translateError': 'Failed to translate abstract',
    'paper.discussion': 'Paper discussion',
    'paper.metadata': 'Metadata',
    'paper.institution': 'Institution',
    'paper.author': 'Authors',
    'paper.collectionSource': 'Collection source',
    'paper.pdfStatus': 'PDF status',
    'paper.verificationStatus': 'Verification status',
    'paper.readingNotes': 'Reading and notes',
    'paper.status': 'Status',
    'paper.tags': 'Tags',
    'paper.privateNote': 'Private note',
    'paper.saveReading': 'Save reading state',
    'paper.readingQueue': 'Reading queue',
    'paper.quickQueueHint': 'Quickly mark this paper in your reading queue without changing favorites or notes.',
    'paper.commentHint': 'Discuss methods, circuits, experiments, and reproducibility. Do not attack authors or share copyrighted PDFs.',
    'paper.commentPlaceholder': 'Write a paper comment. No personal attacks and no PDF sharing.',
    'paper.commentSubmitted': 'Comment submitted. Sensitive content may enter moderation.',
    'paper.commentsLoading': 'Loading comments',
    'paper.commentsPublicOnly': 'Only approved public comments are shown.',
    'paper.commentsEmptyHint': 'Use this for technical questions, reproduction notes, and related work.',
    'paper.loadMoreComments': 'Load more comments',
    'paper.detailLoadFailed': 'Failed to load paper detail',
    'paper.detailLoading': 'Loading paper detail',
    'paper.detailLoadingDesc': 'Preparing DOI, authors, abstract, reading state, and comments.',
    'paper.copiedCitation': 'Copied {format}',
    'paper.queueUpdated': 'Reading state updated',
    'paper.reportSubmitted': 'Report submitted',
    'paper.reportFailed': 'Report failed',
    'paper.reading.unread': 'Unread',
    'paper.reading.reading': 'Reading',
    'paper.reading.read': 'Read',
    'paper.reading.important': 'Important',
    'paper.reading.skip': 'Skip',
    'paper.reading.review_later': 'Review later',
    'paper.reading.use_for_literature_review': 'For literature review',
    'paper.reading.use_for_application': 'For applications',
    'paper.reading.use_for_project': 'For projects',
  },
} as const

type MessageKey = keyof typeof messages.zh

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
  t: (key: MessageKey, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function initialLanguage(): Language {
  if (typeof window === 'undefined') return 'zh'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'zh' || stored === 'en') return stored
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => initialLanguage())

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'zh' ? 'en' : 'zh')
  }, [language, setLanguage])

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
  }, [language])

  const t = useCallback((key: MessageKey, params?: Record<string, string | number>) => {
    let value: string = messages[language][key] || messages.zh[key] || key
    if (params) {
      for (const [name, replacement] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${name}\\}`, 'g'), String(replacement))
      }
    }
    return value
  }, [language])

  const value = useMemo(() => ({ language, setLanguage, toggleLanguage, t }), [language, setLanguage, toggleLanguage, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used within I18nProvider')
  return value
}

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, toggleLanguage, t } = useI18n()
  return (
    <button className={`ss-language-toggle ${compact ? 'compact' : ''}`} type="button" onClick={toggleLanguage}>
      <span>{compact ? (language === 'zh' ? '中' : 'EN') : t('nav.language')}</span>
      <strong>{language === 'zh' ? 'EN' : '中文'}</strong>
    </button>
  )
}
